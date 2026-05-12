'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Form, InputNumber, Button, Row, Col, Alert, Typography, Space, Divider, Tag } from 'antd';
import { SwapOutlined, PlusOutlined, DeleteOutlined, ReloadOutlined, TrophyOutlined, FilePdfOutlined } from '@ant-design/icons';
import { compararAlternativas, fmtMoneda, fmtPct, type ResultadoComparacion } from '@/lib/formulas';
import { guardar, cargar, CLAVES } from '@/lib/storage';
import { COLOR_PRIMARY } from '@/config/antd-theme';
import { exportComparacionPDF } from '@/lib/exportPDF';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const { Text } = Typography;

// Colores por alternativa
const COLORES = ['#8B0D14', '#374151', '#1d4ed8'] as const;

interface AltForm { inversion: number; tasa: number; vida: number; flujos: number[]; residual: number; }

const DEFAULTS: AltForm[] = [
  { inversion: 50000, tasa: 10, vida: 5, flujos: [15000, 18000, 20000, 22000, 25000], residual: 5000 },
  { inversion: 70000, tasa: 10, vida: 5, flujos: [20000, 24000, 26000, 28000, 30000], residual: 8000 },
  { inversion: 60000, tasa: 10, vida: 5, flujos: [17000, 21000, 23000, 26000, 27000], residual: 6000 },
];

const LABELS = ['Alternativa A', 'Alternativa B', 'Alternativa C'];

function AltPanel({
  label, color, flujos, setFlujos, form,
}: {
  label: string; color: string; flujos: number[];
  setFlujos: (f: number[]) => void;
  form: ReturnType<typeof Form.useForm<AltForm>>[0];
}) {
  return (
    <Card
      title={<Text strong style={{ color }}>{label}</Text>}
      style={{ borderRadius: 12, border: `1.5px solid ${color}30` }}
      styles={{ header: { borderBottom: `2px solid ${color}20` } }}
    >
      <Form form={form} layout="vertical" size="middle">
        <Form.Item name="inversion" label="Inversión Inicial" rules={[{ required: true }]}>
          <InputNumber<number> min={0} step={1000} prefix="$" style={{ width: '100%' }}
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={v => Number(v?.replace(/,/g, ''))} />
        </Form.Item>
        <Form.Item name="tasa" label="Tasa TMAR (%)" rules={[{ required: true }]}>
          <InputNumber min={0.01} max={1000} step={0.5} suffix="%" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="vida" label="Vida Útil (años)">
          <InputNumber min={1} max={100} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="residual" label="Valor Residual">
          <InputNumber<number> min={0} step={500} prefix="$" style={{ width: '100%' }}
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={v => Number(v?.replace(/,/g, ''))} />
        </Form.Item>
        <Divider style={{ margin: '8px 0' }}>
          <Text style={{ fontSize: 11, color: '#6b7280' }}>Flujos de Caja</Text>
        </Divider>
        {flujos.map((fc, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ fontSize: 11, color: '#6b7280', minWidth: 52 }}>Año {idx + 1}</Text>
            <InputNumber<number>
              value={fc}
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
          Agregar año
        </Button>
      </Form>
    </Card>
  );
}

export default function ComparacionClient() {
  const [formA] = Form.useForm<AltForm>();
  const [formB] = Form.useForm<AltForm>();
  const [formC] = Form.useForm<AltForm>();
  const forms = [formA, formB, formC];

  const [flujosA, setFlujosA] = useState<number[]>(DEFAULTS[0].flujos);
  const [flujosB, setFlujosB] = useState<number[]>(DEFAULTS[1].flujos);
  const [flujosC, setFlujosC] = useState<number[]>(DEFAULTS[2].flujos);
  const flujosSets = [flujosA, flujosB, flujosC];
  const flujosSets_ = [setFlujosA, setFlujosB, setFlujosC];

  const [resultado, setResultado] = useState<ResultadoComparacion | null>(null);

  useEffect(() => {
    const s = cargar<{ a: AltForm; b: AltForm; c: AltForm }>(
      CLAVES.comparar, { a: DEFAULTS[0], b: DEFAULTS[1], c: DEFAULTS[2] }
    );
    formA.setFieldsValue(s.a); setFlujosA(s.a.flujos);
    formB.setFieldsValue(s.b); setFlujosB(s.b.flujos);
    formC.setFieldsValue(s.c ?? DEFAULTS[2]); setFlujosC(s.c?.flujos ?? DEFAULTS[2].flujos);
  }, [formA, formB, formC]);

  const calcular = useCallback(() => {
    const [va, vb, vc] = forms.map(f => f.getFieldsValue());
    const r = compararAlternativas(
      { nombre: 'Alternativa A', inversionInicial: va.inversion, tasaPorcentaje: va.tasa, vida: va.vida ?? flujosA.length, flujosCaja: flujosA, valorResidual: va.residual },
      { nombre: 'Alternativa B', inversionInicial: vb.inversion, tasaPorcentaje: vb.tasa, vida: vb.vida ?? flujosB.length, flujosCaja: flujosB, valorResidual: vb.residual },
      { nombre: 'Alternativa C', inversionInicial: vc.inversion, tasaPorcentaje: vc.tasa, vida: vc.vida ?? flujosC.length, flujosCaja: flujosC, valorResidual: vc.residual },
    );
    setResultado(r);
    guardar(CLAVES.comparar, { a: { ...va, flujos: flujosA }, b: { ...vb, flujos: flujosB }, c: { ...vc, flujos: flujosC } });
  }, [formA, formB, formC, flujosA, flujosB, flujosC]);

  const resetear = () => {
    forms.forEach((f, i) => f.setFieldsValue(DEFAULTS[i]));
    setFlujosA(DEFAULTS[0].flujos);
    setFlujosB(DEFAULTS[1].flujos);
    setFlujosC(DEFAULTS[2].flujos);
    setResultado(null);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon"><SwapOutlined /></div>
        <div>
          <div className="page-header-title">Comparación de Alternativas</div>
          <div className="page-header-sub">
            Evalúa tres proyectos simultáneamente con VPN, CAE y TIR para identificar la mejor opción económica.
          </div>
        </div>
      </div>

      <div className="formula-box" style={{ marginBottom: 20 }}>
        <div className="formula-text">max(VPN) | max(CAE) | max(TIR) — entre alternativas viables (VPN {'>'} 0)</div>
        <div className="formula-desc">
          Criterio principal: mayor VPN &nbsp;|&nbsp; CAE = VPN × FRC &nbsp;|&nbsp; TIR {'>'} TMAR → aceptar
        </div>
      </div>

      {/* Formularios A, B, C */}
      <Row gutter={[12, 12]}>
        {[formA, formB, formC].map((form, i) => (
          <Col key={i} xs={24} md={8}>
            <AltPanel
              label={LABELS[i]}
              color={COLORES[i]}
              flujos={flujosSets[i]}
              setFlujos={flujosSets_[i]}
              form={form}
            />
          </Col>
        ))}
      </Row>

      <Row gutter={12} style={{ marginTop: 16 }}>
        <Col flex="auto">
          <Button type="primary" block size="large" icon={<SwapOutlined />} onClick={calcular}
            style={{ background: COLOR_PRIMARY, borderColor: COLOR_PRIMARY, fontWeight: 700 }}>
            Comparar Alternativas
          </Button>
        </Col>
        <Col>
          <Button size="large" icon={<ReloadOutlined />} onClick={resetear}>Reiniciar</Button>
        </Col>
      </Row>

      {resultado && (
        <Space direction="vertical" style={{ width: '100%', marginTop: 20 }} size={16}>

          {/* PDF */}
          <Button
            icon={<FilePdfOutlined />}
            onClick={() => exportComparacionPDF(resultado)}
            style={{ borderColor: COLOR_PRIMARY, color: COLOR_PRIMARY, fontWeight: 600 }}
          >
            Descargar PDF
          </Button>

          {/* KPI cards */}
          <Row gutter={12}>
            {resultado.alternativas.map((alt, i) => {
              const esMejor = resultado.mejorVPN === alt.input.nombre;
              return (
                <Col key={alt.input.nombre} xs={24} md={8}>
                  <Card
                    style={{ borderRadius: 12, border: esMejor ? `2px solid ${COLORES[i]}` : '1px solid #e5e7eb' }}
                    title={
                      <Space>
                        <Text strong style={{ color: COLORES[i] }}>{alt.input.nombre}</Text>
                        {esMejor && <Tag color={COLORES[i]} icon={<TrophyOutlined />}>Recomendada</Tag>}
                      </Space>
                    }
                  >
                    <Row gutter={6} style={{ marginBottom: 8 }}>
                      {[
                        { label: 'VPN', val: fmtMoneda(alt.vpn.vpn), ok: alt.vpn.decision !== 'RECHAZAR' },
                        { label: 'CAE', val: fmtMoneda(alt.cae),     ok: alt.cae >= 0 },
                        { label: 'TIR', val: fmtPct(alt.tir.tir),   ok: alt.tir.decision === 'ACEPTAR' },
                      ].map(kpi => (
                        <Col key={kpi.label} span={8}>
                          <div style={{ background: kpi.ok ? '#dcfce7' : '#fee2e2', borderRadius: 8, padding: '6px 4px', textAlign: 'center' }}>
                            <Text style={{ fontSize: 9, color: '#6b7280', display: 'block' }}>{kpi.label}</Text>
                            <Text strong style={{ fontSize: 11, color: kpi.ok ? '#15803d' : '#dc2626' }}>{kpi.val}</Text>
                          </div>
                        </Col>
                      ))}
                    </Row>
                    <div style={{ textAlign: 'center' }}>
                      <span className={alt.vpn.decision === 'ACEPTAR' ? 'badge-aceptar' : 'badge-rechazar'}>
                        {alt.vpn.decision === 'ACEPTAR' ? '✓' : '✗'} VPN: {alt.vpn.decision}
                      </span>
                    </div>
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* Alerta recomendación */}
          <Alert
            type={resultado.mejorVPN ? 'success' : 'error'}
            showIcon
            icon={<TrophyOutlined />}
            message="Recomendación del Sistema"
            description={resultado.recomendacion}
            style={{ borderRadius: 10, fontSize: 14 }}
          />

          {/* Gráficas */}
          <Row gutter={16}>
            <Col xs={24} md={14}>
              <Card title={<Text strong>VPN y CAE — Comparación</Text>} style={{ borderRadius: 12 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={[
                      {
                        metodo: 'VPN',
                        ...Object.fromEntries(resultado.alternativas.map(a => [a.input.nombre, Math.round(a.vpn.vpn * 100) / 100])),
                      },
                      {
                        metodo: 'CAE',
                        ...Object.fromEntries(resultado.alternativas.map(a => [a.input.nombre, Math.round(a.cae * 100) / 100])),
                      },
                    ]}
                    margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="metodo" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <RechartTooltip formatter={(v: number) => fmtMoneda(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={0} stroke="#9ca3af" />
                    {resultado.alternativas.map((alt, i) => (
                      <Bar key={alt.input.nombre} dataKey={alt.input.nombre} fill={COLORES[i]} radius={[3, 3, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
            <Col xs={24} md={10}>
              <Card title={<Text strong>TIR — Comparación</Text>} style={{ borderRadius: 12 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={resultado.alternativas.map(alt => ({
                      alt: alt.input.nombre.replace('Alternativa ', 'Alt. '),
                      TIR: Math.round(alt.tir.tir * 100) / 100,
                      fill: COLORES[resultado.alternativas.indexOf(alt)],
                    }))}
                    margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="alt" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                    <RechartTooltip formatter={(v: number) => [`${v}%`, 'TIR']} />
                    <ReferenceLine
                      y={resultado.alternativas[0].input.tasaPorcentaje}
                      stroke="#3b82f6" strokeDasharray="4 3"
                      label={{ value: `TMAR ${resultado.alternativas[0].input.tasaPorcentaje}%`, position: 'right', fontSize: 9, fill: '#3b82f6' }}
                    />
                    <Bar dataKey="TIR" radius={[3, 3, 0, 0]}>
                      {resultado.alternativas.map((_, i) => (
                        <rect key={i} fill={COLORES[i]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {/* Tabla comparativa */}
          <Card title={<Text strong>Tabla Comparativa Detallada</Text>} style={{ borderRadius: 12 }}>
            {/* Cabecera */}
            <Row style={{ padding: '6px 0 10px', borderBottom: '2px solid #e5e7eb' }}>
              <Col span={6}><Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: 700 }}>CONCEPTO</Text></Col>
              {resultado.alternativas.map((alt, i) => (
                <Col key={alt.input.nombre} span={6} style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: 12, color: COLORES[i], fontWeight: 700 }}>{alt.input.nombre.toUpperCase()}</Text>
                </Col>
              ))}
            </Row>

            {[
              { concepto: 'Inversión Inicial',   vals: resultado.alternativas.map(a => fmtMoneda(a.input.inversionInicial)) },
              { concepto: 'Tasa TMAR',           vals: resultado.alternativas.map(a => `${a.input.tasaPorcentaje}%`) },
              { concepto: 'Vida Útil',           vals: resultado.alternativas.map(a => `${a.input.flujosCaja.length} años`) },
              { concepto: 'Valor Residual',      vals: resultado.alternativas.map(a => fmtMoneda(a.input.valorResidual ?? 0)) },
              { concepto: 'VPN Calculado',       vals: resultado.alternativas.map(a => fmtMoneda(a.vpn.vpn)) },
              { concepto: 'Decisión VPN',        vals: resultado.alternativas.map(a => a.vpn.decision) },
              { concepto: 'CAE Calculado',       vals: resultado.alternativas.map(a => fmtMoneda(a.cae)) },
              { concepto: 'TIR Calculada',       vals: resultado.alternativas.map(a => fmtPct(a.tir.tir)) },
              { concepto: 'Decisión TIR',        vals: resultado.alternativas.map(a => a.tir.decision) },
              { concepto: 'RECOMENDACIÓN',       vals: resultado.alternativas.map(a => resultado.mejorVPN === a.input.nombre ? '★ ELEGIDA' : '') },
            ].map(row => (
              <Row key={row.concepto} style={{ padding: '7px 0', borderBottom: '1px solid #f3f4f6' }} align="middle">
                <Col span={6}><Text style={{ fontSize: 12, color: '#6b7280' }}>{row.concepto}</Text></Col>
                {row.vals.map((val, i) => {
                  const esDecision = row.concepto === 'Decisión VPN' || row.concepto === 'Decisión TIR';
                  const esRec = row.concepto === 'RECOMENDACIÓN';
                  const color = esRec && val ? COLORES[i] :
                    esDecision && val === 'ACEPTAR' ? '#15803d' :
                    esDecision && val === 'RECHAZAR' ? '#dc2626' : '#374151';
                  return (
                    <Col key={i} span={6} style={{ textAlign: 'center' }}>
                      <Text style={{ fontSize: 12, color, fontWeight: esRec && val ? 700 : 400 }}>{val}</Text>
                    </Col>
                  );
                })}
              </Row>
            ))}
          </Card>
        </Space>
      )}
    </div>
  );
}
