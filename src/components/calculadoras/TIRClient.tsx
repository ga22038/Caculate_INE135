'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Form, InputNumber, Button, Row, Col, Alert,
  Typography, Space, Tooltip, Tag, Divider,
} from 'antd';
import {
  RiseOutlined, PlusOutlined, DeleteOutlined, InfoCircleOutlined,
  ReloadOutlined, CalculatorOutlined, CheckCircleFilled,
  CloseCircleFilled, MinusCircleFilled, FilePdfOutlined, TrophyOutlined,
} from '@ant-design/icons';
import { calcularTIR, calcularVPN, fmtPct, fmtMoneda, type ResultadoTIR } from '@/lib/formulas';
import { guardar, cargar, CLAVES } from '@/lib/storage';
import { COLOR_PRIMARY } from '@/config/antd-theme';
import { exportTIRComparacionPDF } from '@/lib/exportPDF';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const { Text } = Typography;

interface FormValues { inversionInicial: number; tasaMinima: number; valorResidual: number; }

const DEF_A: FormValues = { inversionInicial: 60000, tasaMinima: 12, valorResidual: 5000 };
const DEF_B: FormValues = { inversionInicial: 80000, tasaMinima: 12, valorResidual: 8000 };
const FLUJOS_A_DEF = [18000, 22000, 25000, 28000, 30000];
const FLUJOS_B_DEF = [22000, 26000, 30000, 34000, 36000];

const COLORES = { A: '#8B0D14', B: '#374151' } as const;

const DecisionBadge = ({ d }: { d: ResultadoTIR['decision'] }) => {
  if (d === 'NO_CONVERGE') return <span className="badge-indiferente"><MinusCircleFilled /> Sin solución</span>;
  const c = { ACEPTAR: 'badge-aceptar', RECHAZAR: 'badge-rechazar', INDIFERENTE: 'badge-indiferente' }[d];
  const icons = { ACEPTAR: <CheckCircleFilled />, RECHAZAR: <CloseCircleFilled />, INDIFERENTE: <MinusCircleFilled /> };
  return <span className={c}>{icons[d as keyof typeof icons]} {d}</span>;
};

function AltPanel({
  label, color, flujos, setFlujos, form, onReset,
}: {
  label: string; color: string; flujos: number[];
  setFlujos: (f: number[]) => void;
  form: ReturnType<typeof Form.useForm<FormValues>>[0];
  onReset: () => void;
}) {
  return (
    <Card
      title={<Text strong style={{ color }}>{label}</Text>}
      style={{ borderRadius: 12, border: `1.5px solid ${color}30` }}
      styles={{ header: { borderBottom: `2px solid ${color}20` } }}
      extra={<Tooltip title="Reiniciar"><Button size="small" icon={<ReloadOutlined />} onClick={onReset} /></Tooltip>}
    >
      <Form form={form} layout="vertical" size="middle">
        <Form.Item name="inversionInicial" label="Inversión Inicial (I₀)" rules={[{ required: true }]}>
          <InputNumber<number> min={0} step={1000} prefix="$" style={{ width: '100%' }}
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={v => Number(v?.replace(/,/g, ''))} />
        </Form.Item>
        <Form.Item name="tasaMinima" label={
          <Space>TMAR — Tasa Mínima Aceptable (%)
            <Tooltip title="Si TIR > TMAR se acepta el proyecto."><InfoCircleOutlined style={{ color: '#9ca3af' }} /></Tooltip>
          </Space>
        } rules={[{ required: true }]}>
          <InputNumber min={0.01} max={1000} step={0.5} suffix="%" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="valorResidual" label="Valor Residual al final">
          <InputNumber<number> min={0} step={500} prefix="$" style={{ width: '100%' }}
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={v => Number(v?.replace(/,/g, ''))} />
        </Form.Item>

        <Divider style={{ margin: '8px 0' }}>
          <Text style={{ fontSize: 11, color: '#6b7280' }}>Flujos de Caja Anuales</Text>
        </Divider>

        {flujos.map((fc, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ fontSize: 11, color: '#6b7280', minWidth: 52 }}>Año {idx + 1}</Text>
            <InputNumber<number> value={fc}
              onChange={v => setFlujos(flujos.map((f, i) => i === idx ? (v ?? 0) : f))}
              prefix="$" size="small" style={{ flex: 1 }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => Number(v?.replace(/,/g, ''))} />
            <Button size="small" danger icon={<DeleteOutlined />}
              onClick={() => setFlujos(flujos.filter((_, i) => i !== idx))}
              disabled={flujos.length <= 1} />
          </div>
        ))}
        <Button type="dashed" block size="small" icon={<PlusOutlined />}
          onClick={() => setFlujos([...flujos, 0])} style={{ marginTop: 4 }}>
          Agregar período
        </Button>
      </Form>
    </Card>
  );
}

interface ChartInputs { inv: number; vr: number; flujos: number[]; tmar: number; }

export default function TIRClient() {
  const [formA] = Form.useForm<FormValues>();
  const [formB] = Form.useForm<FormValues>();
  const [flujosA, setFlujosA] = useState<number[]>(FLUJOS_A_DEF);
  const [flujosB, setFlujosB] = useState<number[]>(FLUJOS_B_DEF);
  const [resA, setResA] = useState<ResultadoTIR | null>(null);
  const [resB, setResB] = useState<ResultadoTIR | null>(null);
  const [chartA, setChartA] = useState<ChartInputs | null>(null);
  const [chartB, setChartB] = useState<ChartInputs | null>(null);

  useEffect(() => {
    const raw = cargar<unknown>(CLAVES.tir, null);
    const parsed = raw as { a?: FormValues & { flujos?: number[] }; b?: FormValues & { flujos?: number[] } } | null;
    const sa = parsed?.a ?? { ...DEF_A, flujos: FLUJOS_A_DEF };
    const sb = parsed?.b ?? { ...DEF_B, flujos: FLUJOS_B_DEF };
    formA.setFieldsValue(sa); setFlujosA(sa.flujos ?? FLUJOS_A_DEF);
    formB.setFieldsValue(sb); setFlujosB(sb.flujos ?? FLUJOS_B_DEF);
  }, [formA, formB]);

  const calcular = useCallback(() => {
    const va = formA.getFieldsValue();
    const vb = formB.getFieldsValue();
    const ra = calcularTIR(va.inversionInicial ?? 0, flujosA, va.tasaMinima ?? 12, va.valorResidual ?? 0);
    const rb = calcularTIR(vb.inversionInicial ?? 0, flujosB, vb.tasaMinima ?? 12, vb.valorResidual ?? 0);
    setResA(ra);
    setResB(rb);
    setChartA({ inv: va.inversionInicial ?? 0, vr: va.valorResidual ?? 0, flujos: [...flujosA], tmar: va.tasaMinima ?? 12 });
    setChartB({ inv: vb.inversionInicial ?? 0, vr: vb.valorResidual ?? 0, flujos: [...flujosB], tmar: vb.tasaMinima ?? 12 });
    guardar(CLAVES.tir, { a: { ...va, flujos: flujosA }, b: { ...vb, flujos: flujosB } });
  }, [formA, formB, flujosA, flujosB]);

  const resetear = () => {
    formA.setFieldsValue(DEF_A); setFlujosA(FLUJOS_A_DEF);
    formB.setFieldsValue(DEF_B); setFlujosB(FLUJOS_B_DEF);
    setResA(null); setResB(null);
    setChartA(null); setChartB(null);
  };

  const hayResultados = resA !== null && resB !== null;

  const mejorLabel = hayResultados
    ? (resA!.decision === 'RECHAZAR' && resB!.decision === 'RECHAZAR') ? null
    : resA!.decision === 'RECHAZAR' || resA!.decision === 'NO_CONVERGE' ? 'Alternativa B'
    : resB!.decision === 'RECHAZAR' || resB!.decision === 'NO_CONVERGE' ? 'Alternativa A'
    : resA!.tir >= resB!.tir ? 'Alternativa A' : 'Alternativa B'
    : null;

  const recomendacion = !hayResultados ? '' :
    resA!.decision === 'RECHAZAR' && resB!.decision === 'RECHAZAR'
      ? 'Ambas alternativas tienen TIR < TMAR. No se recomienda invertir.'
      : resA!.decision === 'RECHAZAR' ? 'Alternativa B es la única viable (TIR > TMAR).'
      : resB!.decision === 'RECHAZAR' ? 'Alternativa A es la única viable (TIR > TMAR).'
      : `Se recomienda ${mejorLabel} por tener mayor TIR (${mejorLabel === 'Alternativa A' ? fmtPct(resA!.tir) : fmtPct(resB!.tir)}).`;

  // Curvas VPN(tasa) para cada alternativa
  const curvaA = useMemo(() => {
    if (!resA || !chartA || resA.decision === 'NO_CONVERGE') return [];
    const maxRate = Math.min(Math.max(resA.tir * 2.5, chartA.tmar * 2.5, 50), 150);
    return Array.from({ length: 61 }, (_, i) => {
      const tasa = (maxRate / 60) * i;
      return { tasa: Math.round(tasa * 10) / 10, VPN: Math.round(calcularVPN(chartA.inv, tasa, chartA.flujos, chartA.vr).vpn * 100) / 100 };
    });
  }, [resA, chartA]);

  const curvaB = useMemo(() => {
    if (!resB || !chartB || resB.decision === 'NO_CONVERGE') return [];
    const maxRate = Math.min(Math.max(resB.tir * 2.5, chartB.tmar * 2.5, 50), 150);
    return Array.from({ length: 61 }, (_, i) => {
      const tasa = (maxRate / 60) * i;
      return { tasa: Math.round(tasa * 10) / 10, VPN: Math.round(calcularVPN(chartB.inv, tasa, chartB.flujos, chartB.vr).vpn * 100) / 100 };
    });
  }, [resB, chartB]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon"><RiseOutlined /></div>
        <div>
          <div className="page-header-title">Tasa Interna de Retorno (TIR)</div>
          <div className="page-header-sub">
            Compara dos alternativas calculando la tasa i* que hace VPN = 0 en cada una. Si TIR {'>'} TMAR → rentable.
          </div>
        </div>
      </div>

      <div className="formula-box" style={{ marginBottom: 20 }}>
        <div className="formula-text">0 = −I₀ + Σ [FCₜ / (1 + TIR)ᵗ]  →  Despejar TIR</div>
        <div className="formula-desc">
          Método de bisección numérica &nbsp;|&nbsp; Criterio: TIR {'>'} TMAR → Aceptar &nbsp;|&nbsp;
          Entre viables: elegir mayor TIR
        </div>
      </div>

      {/* Paneles A y B */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <AltPanel label="Alternativa A" color={COLORES.A} flujos={flujosA} setFlujos={setFlujosA}
            form={formA}
            onReset={() => { formA.setFieldsValue(DEF_A); setFlujosA(FLUJOS_A_DEF); setResA(null); setResB(null); }} />
        </Col>
        <Col xs={24} md={12}>
          <AltPanel label="Alternativa B" color={COLORES.B} flujos={flujosB} setFlujos={setFlujosB}
            form={formB}
            onReset={() => { formB.setFieldsValue(DEF_B); setFlujosB(FLUJOS_B_DEF); setResA(null); setResB(null); }} />
        </Col>
      </Row>

      <Row gutter={12} style={{ marginTop: 16 }}>
        <Col flex="auto">
          <Button type="primary" block size="large" icon={<CalculatorOutlined />} onClick={calcular}
            style={{ background: COLOR_PRIMARY, borderColor: COLOR_PRIMARY, fontWeight: 700 }}>
            Calcular y Comparar TIR
          </Button>
        </Col>
        <Col>
          <Button size="large" icon={<ReloadOutlined />} onClick={resetear}>Reiniciar</Button>
        </Col>
      </Row>

      {hayResultados && resA && resB && (
        <Space direction="vertical" style={{ width: '100%', marginTop: 20 }} size={16}>

          {/* PDF */}
          <Button
            icon={<FilePdfOutlined />}
            onClick={() => exportTIRComparacionPDF(
              resA, { inversionInicial: formA.getFieldValue('inversionInicial') ?? 0, tasaMinima: formA.getFieldValue('tasaMinima') ?? 0, valorResidual: formA.getFieldValue('valorResidual') ?? 0, flujos: flujosA },
              resB, { inversionInicial: formB.getFieldValue('inversionInicial') ?? 0, tasaMinima: formB.getFieldValue('tasaMinima') ?? 0, valorResidual: formB.getFieldValue('valorResidual') ?? 0, flujos: flujosB },
              mejorLabel ?? '',
            )}
            style={{ borderColor: COLOR_PRIMARY, color: COLOR_PRIMARY, fontWeight: 600 }}
          >
            Descargar PDF
          </Button>

          {/* KPI cards */}
          <Row gutter={12}>
            {[
              { label: 'Alternativa A', res: resA, color: COLORES.A },
              { label: 'Alternativa B', res: resB, color: COLORES.B },
            ].map(({ label, res, color }) => {
              const esMejor = mejorLabel === label;
              const decColor = res.decision === 'ACEPTAR' ? '#15803d' : res.decision === 'RECHAZAR' ? '#dc2626' : '#b45309';
              const decBg   = res.decision === 'ACEPTAR' ? '#dcfce7' : res.decision === 'RECHAZAR' ? '#fee2e2' : '#fef3c7';
              return (
                <Col key={label} span={12}>
                  <Card
                    style={{ borderRadius: 12, border: esMejor ? `2px solid ${color}` : '1px solid #e5e7eb' }}
                    title={
                      <Space>
                        <Text strong style={{ color }}>{label}</Text>
                        {esMejor && <Tag color={color} icon={<TrophyOutlined />}>Recomendada</Tag>}
                      </Space>
                    }
                  >
                    <Row gutter={8} style={{ marginBottom: 10 }}>
                      <Col span={12}>
                        <div style={{ background: decBg, borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                          <Text style={{ fontSize: 10, color: '#6b7280', display: 'block' }}>TIR</Text>
                          <Text strong style={{ fontSize: 18, color: decColor }}>
                            {res.decision === 'NO_CONVERGE' ? 'N/A' : fmtPct(res.tir)}
                          </Text>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ background: '#dbeafe', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                          <Text style={{ fontSize: 10, color: '#6b7280', display: 'block' }}>TMAR</Text>
                          <Text strong style={{ fontSize: 18, color: '#1d4ed8' }}>{fmtPct(res.tasaMinima)}</Text>
                        </div>
                      </Col>
                    </Row>
                    <div style={{ textAlign: 'center' }}>
                      <DecisionBadge d={res.decision} />
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* Recomendación */}
          <Alert
            type={mejorLabel ? 'success' : 'error'}
            showIcon icon={<TrophyOutlined />}
            message="Recomendación del Sistema"
            description={recomendacion}
            style={{ borderRadius: 10, fontSize: 14 }}
          />

          {/* Gráfica barras TIR comparativo */}
          <Card title={<Text strong>TIR Comparativo — A vs B</Text>} style={{ borderRadius: 12 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[
                  { alt: 'Alt. A', TIR: Math.round(resA.tir * 100) / 100 },
                  { alt: 'Alt. B', TIR: Math.round(resB.tir * 100) / 100 },
                ]}
                margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="alt" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                <RechartTooltip formatter={(v: number) => [`${v}%`, 'TIR']} />
                <ReferenceLine y={resA.tasaMinima} stroke="#3b82f6" strokeDasharray="4 3"
                  label={{ value: `TMAR ${resA.tasaMinima}%`, position: 'right', fontSize: 9, fill: '#3b82f6' }} />
                <Bar dataKey="TIR" radius={[3, 3, 0, 0]}>
                  {[COLORES.A, COLORES.B].map((c, i) => <rect key={i} fill={c} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Curvas VPN(tasa) */}
          <Row gutter={16}>
            {[
              { label: 'Alternativa A', curva: curvaA, res: resA, color: COLORES.A },
              { label: 'Alternativa B', curva: curvaB, res: resB, color: COLORES.B },
            ].map(({ label, curva, res, color }) => (
              curva.length > 0 && (
                <Col key={label} xs={24} md={12}>
                  <Card title={<Text strong style={{ color }}>{label} — VPN vs Tasa</Text>} style={{ borderRadius: 12 }}>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={curva} margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="tasa" tickFormatter={v => `${v}%`} tick={{ fontSize: 9 }} />
                        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 9 }} />
                        <RechartTooltip formatter={(v: number) => [fmtMoneda(v), 'VPN']} labelFormatter={l => `Tasa: ${l}%`} />
                        <ReferenceLine y={0} stroke="#6b7280" strokeWidth={1.5} />
                        <ReferenceLine x={Math.round(res.tir * 10) / 10} stroke={color} strokeDasharray="4 3"
                          label={{ value: `TIR=${fmtPct(res.tir)}`, position: 'top', fontSize: 8, fill: color }} />
                        <ReferenceLine x={res.tasaMinima} stroke="#3b82f6" strokeDasharray="4 3"
                          label={{ value: `TMAR`, position: 'insideTopLeft', fontSize: 8, fill: '#3b82f6' }} />
                        <Line type="monotone" dataKey="VPN" stroke={color} strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </Card>
                </Col>
              )
            ))}
          </Row>

          {/* Tabla comparativa */}
          <Card title={<Text strong>Tabla Comparativa Resumen</Text>} style={{ borderRadius: 12 }}>
            <Row style={{ padding: '6px 0 10px', borderBottom: '2px solid #e5e7eb' }}>
              <Col span={10}><Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: 700 }}>CONCEPTO</Text></Col>
              <Col span={7} style={{ textAlign: 'center' }}><Text style={{ fontSize: 12, color: COLORES.A, fontWeight: 700 }}>ALTERNATIVA A</Text></Col>
              <Col span={7} style={{ textAlign: 'center' }}><Text style={{ fontSize: 12, color: COLORES.B, fontWeight: 700 }}>ALTERNATIVA B</Text></Col>
            </Row>
            {[
              { concepto: 'Inversión Inicial', a: fmtMoneda(formA.getFieldValue('inversionInicial') ?? 0), b: fmtMoneda(formB.getFieldValue('inversionInicial') ?? 0) },
              { concepto: 'Períodos',          a: `${flujosA.length} años`,                               b: `${flujosB.length} años` },
              { concepto: 'Valor Residual',    a: fmtMoneda(formA.getFieldValue('valorResidual') ?? 0),   b: fmtMoneda(formB.getFieldValue('valorResidual') ?? 0) },
              { concepto: 'TMAR',              a: fmtPct(resA.tasaMinima),                                b: fmtPct(resB.tasaMinima) },
              { concepto: 'TIR Calculada',     a: resA.decision === 'NO_CONVERGE' ? 'N/A' : fmtPct(resA.tir), b: resB.decision === 'NO_CONVERGE' ? 'N/A' : fmtPct(resB.tir) },
              { concepto: 'TIR − TMAR',        a: resA.decision === 'NO_CONVERGE' ? '—' : fmtPct(resA.tir - resA.tasaMinima), b: resB.decision === 'NO_CONVERGE' ? '—' : fmtPct(resB.tir - resB.tasaMinima) },
              { concepto: 'Decisión',          a: resA.decision,                                          b: resB.decision },
              { concepto: 'RECOMENDACIÓN',     a: mejorLabel === 'Alternativa A' ? '★ ELEGIDA' : '',      b: mejorLabel === 'Alternativa B' ? '★ ELEGIDA' : '' },
            ].map(row => (
              <Row key={row.concepto} style={{ padding: '7px 0', borderBottom: '1px solid #f3f4f6' }} align="middle">
                <Col span={10}><Text style={{ fontSize: 12, color: '#6b7280' }}>{row.concepto}</Text></Col>
                <Col span={7} style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: row.concepto === 'RECOMENDACIÓN' && row.a ? 700 : 400,
                    color: row.concepto === 'RECOMENDACIÓN' && row.a ? COLORES.A : row.concepto === 'Decisión' && row.a === 'ACEPTAR' ? '#15803d' : row.concepto === 'Decisión' && row.a === 'RECHAZAR' ? '#dc2626' : '#374151' }}>
                    {row.a}
                  </Text>
                </Col>
                <Col span={7} style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: row.concepto === 'RECOMENDACIÓN' && row.b ? 700 : 400,
                    color: row.concepto === 'RECOMENDACIÓN' && row.b ? COLORES.B : row.concepto === 'Decisión' && row.b === 'ACEPTAR' ? '#15803d' : row.concepto === 'Decisión' && row.b === 'RECHAZAR' ? '#dc2626' : '#374151' }}>
                    {row.b}
                  </Text>
                </Col>
              </Row>
            ))}
          </Card>

          <Alert type="info" showIcon message="Método de cálculo"
            description="La TIR se calcula con bisección numérica (500 iteraciones, precisión 10⁻⁸). Garantiza convergencia cuando existe una única TIR real por alternativa."
            style={{ borderRadius: 10 }} />
        </Space>
      )}

      {!hayResultados && (
        <Card style={{ borderRadius: 12, marginTop: 16 }}>
          <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
            <RiseOutlined style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }} />
            <br />
            <Text style={{ color: '#9ca3af' }}>
              Complete los datos de ambas alternativas y presione <strong>Calcular y Comparar TIR</strong>
            </Text>
          </div>
        </Card>
      )}
    </div>
  );
}
