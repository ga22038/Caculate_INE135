'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card, Form, InputNumber, Button, Table, Row, Col,
  Alert, Divider, Typography, Space, Tooltip, Tag,
} from 'antd';
import {
  CalculatorOutlined, PlusOutlined, DeleteOutlined,
  InfoCircleOutlined, ReloadOutlined, CheckCircleFilled,
  CloseCircleFilled, MinusCircleFilled, FilePdfOutlined, TrophyOutlined,
} from '@ant-design/icons';
import { calcularVPN, fmtMoneda, rd4, type ResultadoVPN } from '@/lib/formulas';
import { guardar, cargar, CLAVES } from '@/lib/storage';
import { COLOR_PRIMARY } from '@/config/antd-theme';
import { exportVPNComparacionPDF } from '@/lib/exportPDF';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const { Text } = Typography;

interface FormValues {
  inversionInicial: number;
  tasaDescuento:    number;
  valorResidual:    number;
}

const DEF_A: FormValues = { inversionInicial: 50000, tasaDescuento: 10, valorResidual: 0 };
const DEF_B: FormValues = { inversionInicial: 70000, tasaDescuento: 10, valorResidual: 5000 };
const FLUJOS_A_DEF = [15000, 18000, 20000, 22000, 25000];
const FLUJOS_B_DEF = [20000, 24000, 26000, 28000, 30000];

const COLORES = { A: '#8B0D14', B: '#374151' } as const;

const DecisionBadge = ({ decision }: { decision: ResultadoVPN['decision'] }) => {
  const conf = {
    ACEPTAR:     { cls: 'badge-aceptar',     icon: <CheckCircleFilled />, txt: 'ACEPTAR' },
    RECHAZAR:    { cls: 'badge-rechazar',    icon: <CloseCircleFilled />, txt: 'RECHAZAR' },
    INDIFERENTE: { cls: 'badge-indiferente', icon: <MinusCircleFilled />, txt: 'INDIFERENTE' },
  }[decision];
  return <span className={conf.cls}>{conf.icon} {conf.txt}</span>;
};

function AltPanel({
  label, color, flujos, setFlujos, form, defaultValues, onReset,
}: {
  label: string; color: string; flujos: number[];
  setFlujos: (f: number[]) => void;
  form: ReturnType<typeof Form.useForm<FormValues>>[0];
  defaultValues: FormValues;
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
        <Form.Item name="tasaDescuento" label={
          <Space>Tasa de Descuento TMAR (%)
            <Tooltip title="Tasa Mínima Aceptable de Rendimiento."><InfoCircleOutlined style={{ color: '#9ca3af' }} /></Tooltip>
          </Space>
        } rules={[{ required: true }]}>
          <InputNumber min={0.01} max={1000} step={0.5} suffix="%" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="valorResidual" label="Valor Residual / Salvamento">
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

export default function VPNClient() {
  const [formA] = Form.useForm<FormValues>();
  const [formB] = Form.useForm<FormValues>();
  const [flujosA, setFlujosA] = useState<number[]>(FLUJOS_A_DEF);
  const [flujosB, setFlujosB] = useState<number[]>(FLUJOS_B_DEF);
  const [resA, setResA] = useState<ResultadoVPN | null>(null);
  const [resB, setResB] = useState<ResultadoVPN | null>(null);

  useEffect(() => {
    const s = cargar<{ a: FormValues & { flujos: number[] }; b: FormValues & { flujos: number[] } }>(
      CLAVES.vpn, { a: { ...DEF_A, flujos: FLUJOS_A_DEF }, b: { ...DEF_B, flujos: FLUJOS_B_DEF } }
    );
    formA.setFieldsValue(s.a); setFlujosA(s.a.flujos ?? FLUJOS_A_DEF);
    formB.setFieldsValue(s.b); setFlujosB(s.b.flujos ?? FLUJOS_B_DEF);
  }, [formA, formB]);

  const calcular = useCallback(() => {
    const va = formA.getFieldsValue();
    const vb = formB.getFieldsValue();
    const ra = calcularVPN(va.inversionInicial ?? 0, va.tasaDescuento ?? 10, flujosA, va.valorResidual ?? 0);
    const rb = calcularVPN(vb.inversionInicial ?? 0, vb.tasaDescuento ?? 10, flujosB, vb.valorResidual ?? 0);
    setResA(ra);
    setResB(rb);
    guardar(CLAVES.vpn, { a: { ...va, flujos: flujosA }, b: { ...vb, flujos: flujosB } });
  }, [formA, formB, flujosA, flujosB]);

  const resetear = () => {
    formA.setFieldsValue(DEF_A); setFlujosA(FLUJOS_A_DEF);
    formB.setFieldsValue(DEF_B); setFlujosB(FLUJOS_B_DEF);
    setResA(null); setResB(null);
  };

  const hayResultados = resA !== null && resB !== null;

  const mejorLabel = hayResultados
    ? (resA!.decision === 'RECHAZAR' && resB!.decision === 'RECHAZAR') ? null
    : resA!.decision === 'RECHAZAR' ? 'Alternativa B'
    : resB!.decision === 'RECHAZAR' ? 'Alternativa A'
    : resA!.vpn >= resB!.vpn ? 'Alternativa A' : 'Alternativa B'
    : null;

  const recomendacion = !hayResultados ? '' :
    resA!.decision === 'RECHAZAR' && resB!.decision === 'RECHAZAR'
      ? 'Ambas alternativas tienen VPN negativo. No se recomienda invertir.'
      : resA!.decision === 'RECHAZAR'
      ? 'Alternativa B es la única viable (VPN > 0).'
      : resB!.decision === 'RECHAZAR'
      ? 'Alternativa A es la única viable (VPN > 0).'
      : `Se recomienda ${mejorLabel} por tener mayor VPN (${fmtMoneda(mejorLabel === 'Alternativa A' ? resA!.vpn : resB!.vpn)}).`;

  const columnas = (color: string) => [
    { title: 'Período', dataIndex: 'periodo', width: 80, align: 'center' as const, render: (v: number) => `t=${v}` },
    { title: 'Flujo de Caja', dataIndex: 'flujoCaja', align: 'right' as const, render: (v: number) => fmtMoneda(v) },
    { title: 'Factor P/F', dataIndex: 'factorPF', align: 'right' as const, render: (v: number) => rd4(v).toFixed(4) },
    { title: 'Flujo Descontado', dataIndex: 'flujoCajaDescontado', align: 'right' as const, render: (v: number) => <span style={{ color }}>{fmtMoneda(v)}</span> },
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon"><CalculatorOutlined /></div>
        <div>
          <div className="page-header-title">Valor Presente Neto (VPN)</div>
          <div className="page-header-sub">
            Compara dos alternativas descontando sus flujos de caja al presente con la tasa TMAR.
          </div>
        </div>
      </div>

      <div className="formula-box" style={{ marginBottom: 20 }}>
        <div className="formula-text">VPN = −I₀ + Σ [FCₜ / (1 + i)ᵗ]</div>
        <div className="formula-desc">
          I₀ = Inversión inicial &nbsp;|&nbsp; FCₜ = Flujo período t &nbsp;|&nbsp;
          i = TMAR &nbsp;|&nbsp; Seleccionar mayor VPN entre alternativas viables
        </div>
      </div>

      {/* Paneles A y B */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <AltPanel label="Alternativa A" color={COLORES.A} flujos={flujosA} setFlujos={setFlujosA}
            form={formA} defaultValues={DEF_A}
            onReset={() => { formA.setFieldsValue(DEF_A); setFlujosA(FLUJOS_A_DEF); setResA(null); setResB(null); }} />
        </Col>
        <Col xs={24} md={12}>
          <AltPanel label="Alternativa B" color={COLORES.B} flujos={flujosB} setFlujos={setFlujosB}
            form={formB} defaultValues={DEF_B}
            onReset={() => { formB.setFieldsValue(DEF_B); setFlujosB(FLUJOS_B_DEF); setResA(null); setResB(null); }} />
        </Col>
      </Row>

      <Row gutter={12} style={{ marginTop: 16 }}>
        <Col flex="auto">
          <Button type="primary" block size="large" icon={<CalculatorOutlined />} onClick={calcular}
            style={{ background: COLOR_PRIMARY, borderColor: COLOR_PRIMARY, fontWeight: 700 }}>
            Calcular y Comparar VPN
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
            onClick={() => exportVPNComparacionPDF(
              resA, { inversionInicial: formA.getFieldValue('inversionInicial') ?? 0, tasaDescuento: formA.getFieldValue('tasaDescuento') ?? 0, valorResidual: formA.getFieldValue('valorResidual') ?? 0 },
              resB, { inversionInicial: formB.getFieldValue('inversionInicial') ?? 0, tasaDescuento: formB.getFieldValue('tasaDescuento') ?? 0, valorResidual: formB.getFieldValue('valorResidual') ?? 0 },
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
                        <div style={{ background: res.vpn >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                          <Text style={{ fontSize: 10, color: '#6b7280', display: 'block' }}>VPN</Text>
                          <Text strong style={{ fontSize: 14, color: res.vpn >= 0 ? '#15803d' : '#dc2626' }}>{fmtMoneda(res.vpn)}</Text>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ background: res.decision === 'ACEPTAR' ? '#dcfce7' : res.decision === 'RECHAZAR' ? '#fee2e2' : '#fef3c7', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                          <Text style={{ fontSize: 10, color: '#6b7280', display: 'block' }}>DECISIÓN</Text>
                          <Text strong style={{ fontSize: 13, color: res.decision === 'ACEPTAR' ? '#15803d' : res.decision === 'RECHAZAR' ? '#dc2626' : '#b45309' }}>{res.decision}</Text>
                        </div>
                      </Col>
                    </Row>
                    <div style={{ textAlign: 'center' }}>
                      <DecisionBadge decision={res.decision} />
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* Recomendación */}
          <Alert
            type={mejorLabel ? 'success' : 'error'}
            showIcon
            icon={<TrophyOutlined />}
            message="Recomendación del Sistema"
            description={recomendacion}
            style={{ borderRadius: 10, fontSize: 14 }}
          />

          {/* Gráfica VPN comparativo */}
          <Card title={<Text strong>VPN Comparativo — A vs B</Text>} style={{ borderRadius: 12 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={[{ metrica: 'VPN', 'Alternativa A': Math.round(resA.vpn * 100) / 100, 'Alternativa B': Math.round(resB.vpn * 100) / 100 }]}
                margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="metrica" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <RechartTooltip formatter={(v: number) => fmtMoneda(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="#9ca3af" />
                <Bar dataKey="Alternativa A" fill={COLORES.A} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Alternativa B" fill={COLORES.B} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Tablas de flujos */}
          <Row gutter={16}>
            {[
              { label: 'Alternativa A', res: resA, color: COLORES.A, inv: formA.getFieldValue('inversionInicial') ?? 0 },
              { label: 'Alternativa B', res: resB, color: COLORES.B, inv: formB.getFieldValue('inversionInicial') ?? 0 },
            ].map(({ label, res, color, inv }) => (
              <Col key={label} xs={24} md={12}>
                <Card title={<Text strong style={{ color }}>{label} — Flujos Descontados</Text>} style={{ borderRadius: 12 }}>
                  <Table
                    className="tabla-resultado"
                    dataSource={res.filas.map(f => ({ ...f, key: f.periodo }))}
                    columns={columnas(color)}
                    size="small"
                    pagination={false}
                    summary={() => (
                      <Table.Summary.Row style={{ background: '#FEF2F2', fontWeight: 700 }}>
                        <Table.Summary.Cell index={0} align="center">Total</Table.Summary.Cell>
                        <Table.Summary.Cell index={1} align="right">{fmtMoneda(res.filas.reduce((s, f) => s + f.flujoCaja, 0))}</Table.Summary.Cell>
                        <Table.Summary.Cell index={2} align="right">—</Table.Summary.Cell>
                        <Table.Summary.Cell index={3} align="right">
                          <span style={{ color: res.vpn >= 0 ? '#15803d' : '#dc2626' }}>
                            {fmtMoneda(res.filas.reduce((s, f) => s + f.flujoCajaDescontado, 0))}
                          </span>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    )}
                  />
                  <div style={{ marginTop: 8, padding: '8px 12px', background: '#f9fafb', borderRadius: 8 }}>
                    <Text style={{ fontSize: 11, color: '#6b7280' }}>
                      VPN = −${inv.toLocaleString()} + {fmtMoneda(res.filas.reduce((s, f) => s + f.flujoCajaDescontado, 0))} = {' '}
                      <strong style={{ color: res.vpn >= 0 ? '#15803d' : '#dc2626' }}>{fmtMoneda(res.vpn)}</strong>
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Gráfica flujos por alternativa */}
          <Row gutter={16}>
            {[
              { label: 'Alternativa A', res: resA, color: COLORES.A },
              { label: 'Alternativa B', res: resB, color: COLORES.B },
            ].map(({ label, res, color }) => (
              <Col key={label} xs={24} md={12}>
                <Card title={<Text strong style={{ color }}>{label} — Original vs Descontado</Text>} style={{ borderRadius: 12 }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={res.filas.map(f => ({ periodo: `t=${f.periodo}`, 'Original': f.flujoCaja, 'Descontado': Math.round(f.flujoCajaDescontado * 100) / 100 }))}
                      margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 9 }} />
                      <RechartTooltip formatter={(v: number) => fmtMoneda(v)} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="Original" fill="#9ca3af" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="Descontado" fill={color} radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Tabla comparativa resumen */}
          <Card title={<Text strong>Tabla Comparativa Resumen</Text>} style={{ borderRadius: 12 }}>
            <Row style={{ padding: '6px 0 10px', borderBottom: '2px solid #e5e7eb' }}>
              <Col span={10}><Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: 700 }}>CONCEPTO</Text></Col>
              <Col span={7} style={{ textAlign: 'center' }}><Text style={{ fontSize: 12, color: COLORES.A, fontWeight: 700 }}>ALTERNATIVA A</Text></Col>
              <Col span={7} style={{ textAlign: 'center' }}><Text style={{ fontSize: 12, color: COLORES.B, fontWeight: 700 }}>ALTERNATIVA B</Text></Col>
            </Row>
            {[
              { concepto: 'Inversión Inicial',  a: fmtMoneda(formA.getFieldValue('inversionInicial') ?? 0), b: fmtMoneda(formB.getFieldValue('inversionInicial') ?? 0) },
              { concepto: 'Tasa TMAR',          a: `${formA.getFieldValue('tasaDescuento')}%`,              b: `${formB.getFieldValue('tasaDescuento')}%` },
              { concepto: 'Períodos',           a: `${resA.periodos} años`,                                 b: `${resB.periodos} años` },
              { concepto: 'Valor Residual',     a: fmtMoneda(formA.getFieldValue('valorResidual') ?? 0),    b: fmtMoneda(formB.getFieldValue('valorResidual') ?? 0) },
              { concepto: 'VPN Calculado',      a: fmtMoneda(resA.vpn),                                     b: fmtMoneda(resB.vpn) },
              { concepto: 'Decisión',           a: resA.decision,                                            b: resB.decision },
              { concepto: 'RECOMENDACIÓN',      a: mejorLabel === 'Alternativa A' ? '★ ELEGIDA' : '',        b: mejorLabel === 'Alternativa B' ? '★ ELEGIDA' : '' },
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
        </Space>
      )}

      {!hayResultados && (
        <Card style={{ borderRadius: 12, marginTop: 16 }}>
          <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
            <CalculatorOutlined style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }} />
            <br />
            <Text style={{ color: '#9ca3af' }}>
              Complete los datos de ambas alternativas y presione <strong>Calcular y Comparar VPN</strong>
            </Text>
          </div>
        </Card>
      )}
    </div>
  );
}
