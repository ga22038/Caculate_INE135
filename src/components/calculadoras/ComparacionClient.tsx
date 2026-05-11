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

interface AltForm { inversion: number; tasa: number; vida: number; flujos: number[]; residual: number; }
const DEF_A: AltForm = { inversion: 50000, tasa: 10, vida: 5, flujos: [15000, 18000, 20000, 22000, 25000], residual: 5000 };
const DEF_B: AltForm = { inversion: 70000, tasa: 10, vida: 5, flujos: [20000, 24000, 26000, 28000, 30000], residual: 8000 };

function AltPanel({ label, color, flujos, setFlujos, form }: { label: string; color: string; flujos: number[]; setFlujos: (f: number[]) => void; form: ReturnType<typeof Form.useForm<AltForm>>[0]; }) {
  return (
    <Card
      title={<Text strong style={{ color }}>{label}</Text>}
      style={{ borderRadius: 12, border: `1.5px solid ${color}30` }}
      styles={{ header: { borderBottom: `2px solid ${color}20` } }}
    >
      <Form form={form} layout="vertical" size="middle">
        <Form.Item name="inversion" label="Inversión Inicial" rules={[{ required: true }]}>
          <InputNumber<number> min={0} step={1000} prefix="$" style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => Number(v?.replace(/,/g, ''))} />
        </Form.Item>
        <Form.Item name="tasa" label="Tasa de Descuento TMAR (%)" rules={[{ required: true }]}>
          <InputNumber min={0.01} max={1000} step={0.5} suffix="%" style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="vida" label="Vida Útil (años)">
          <InputNumber min={1} max={100} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="residual" label="Valor Residual">
          <InputNumber<number> min={0} step={500} prefix="$" style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => Number(v?.replace(/,/g, ''))} />
        </Form.Item>
        <Divider style={{ margin: '8px 0' }}><Text style={{ fontSize: 11, color: '#6b7280' }}>Flujos de Caja</Text></Divider>
        {flujos.map((fc, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 6 }}>
            <Text style={{ fontSize: 11, color: '#6b7280', minWidth: 52 }}>Año {idx + 1}</Text>
            <InputNumber<number> value={fc} onChange={v => setFlujos(flujos.map((f, i) => i === idx ? (v ?? 0) : f))} prefix="$" size="small" style={{ flex: 1 }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => Number(v?.replace(/,/g, ''))} />
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setFlujos(flujos.filter((_, i) => i !== idx))} disabled={flujos.length <= 1} />
          </div>
        ))}
        <Button type="dashed" block size="small" icon={<PlusOutlined />} onClick={() => setFlujos([...flujos, 0])} style={{ marginTop: 4 }}>Agregar año</Button>
      </Form>
    </Card>
  );
}

export default function ComparacionClient() {
  const [formA]   = Form.useForm<AltForm>();
  const [formB]   = Form.useForm<AltForm>();
  const [flujosA, setFlujosA] = useState<number[]>(DEF_A.flujos);
  const [flujosB, setFlujosB] = useState<number[]>(DEF_B.flujos);
  const [resultado, setResultado] = useState<ResultadoComparacion | null>(null);

  useEffect(() => {
    const s = cargar<{ a: AltForm; b: AltForm }>(CLAVES.comparar, { a: DEF_A, b: DEF_B });
    formA.setFieldsValue(s.a); setFlujosA(s.a.flujos);
    formB.setFieldsValue(s.b); setFlujosB(s.b.flujos);
  }, [formA, formB]);

  const calcular = useCallback(() => {
    const va = formA.getFieldsValue();
    const vb = formB.getFieldsValue();
    const r = compararAlternativas(
      { nombre: 'Alternativa A', inversionInicial: va.inversion, tasaPorcentaje: va.tasa, vida: va.vida ?? flujosA.length, flujosCaja: flujosA, valorResidual: va.residual },
      { nombre: 'Alternativa B', inversionInicial: vb.inversion, tasaPorcentaje: vb.tasa, vida: vb.vida ?? flujosB.length, flujosCaja: flujosB, valorResidual: vb.residual },
    );
    setResultado(r);
    guardar(CLAVES.comparar, { a: { ...va, flujos: flujosA }, b: { ...vb, flujos: flujosB } });
  }, [formA, formB, flujosA, flujosB]);

  const resetear = () => {
    formA.setFieldsValue(DEF_A); setFlujosA(DEF_A.flujos);
    formB.setFieldsValue(DEF_B); setFlujosB(DEF_B.flujos);
    setResultado(null);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon"><SwapOutlined /></div>
        <div>
          <div className="page-header-title">Comparación de Alternativas</div>
          <div className="page-header-sub">Evalúa dos proyectos con VPN, CAE y TIR para identificar la mejor opción económica.</div>
        </div>
      </div>

      <div className="formula-box" style={{ marginBottom: 20 }}>
        <div className="formula-text">max(VPN) | max(CAE) | max(TIR) — siempre que sean viables</div>
        <div className="formula-desc">
          VPN {'>'} 0 → viable &nbsp;|&nbsp; CAE = VPN × FRC &nbsp;|&nbsp; TIR {'>'} TMAR → aceptar &nbsp;|&nbsp;
          Criterio principal: mayor VPN entre alternativas viables
        </div>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <AltPanel label="Alternativa A" color="#991B1B" flujos={flujosA} setFlujos={setFlujosA} form={formA} />
        </Col>
        <Col xs={24} md={12}>
          <AltPanel label="Alternativa B" color="#374151" flujos={flujosB} setFlujos={setFlujosB} form={formB} />
        </Col>
      </Row>

      <Row gutter={12} style={{ marginTop: 16 }}>
        <Col flex="auto">
          <Button type="primary" block size="large" icon={<SwapOutlined />} onClick={calcular} style={{ background: COLOR_PRIMARY, borderColor: COLOR_PRIMARY, fontWeight: 700 }}>
            Comparar Alternativas
          </Button>
        </Col>
        <Col>
          <Button size="large" icon={<ReloadOutlined />} onClick={resetear}>Reiniciar</Button>
        </Col>
      </Row>

      {resultado && (
        <Space direction="vertical" style={{ width: '100%', marginTop: 20 }} size={16}>
          {/* Botón PDF */}
          <Button
            icon={<FilePdfOutlined />}
            onClick={() => exportComparacionPDF(resultado)}
            style={{ borderColor: COLOR_PRIMARY, color: COLOR_PRIMARY, fontWeight: 600 }}
          >
            Descargar PDF
          </Button>

          {/* Cards por alternativa */}
          <Row gutter={12}>
            {[
              {
                label: 'Alternativa A',
                vpn: resultado.vpnA.vpn, dec: resultado.vpnA.decision,
                tir: resultado.tirA.tir, tirDec: resultado.tirA.decision,
                cae: resultado.caeA,
                esMejorVPN: resultado.mejorVPN === 'Alternativa A',
                esMejorCAE: resultado.mejorCAE === 'Alternativa A',
              },
              {
                label: 'Alternativa B',
                vpn: resultado.vpnB.vpn, dec: resultado.vpnB.decision,
                tir: resultado.tirB.tir, tirDec: resultado.tirB.decision,
                cae: resultado.caeB,
                esMejorVPN: resultado.mejorVPN === 'Alternativa B',
                esMejorCAE: resultado.mejorCAE === 'Alternativa B',
              },
            ].map(alt => (
              <Col key={alt.label} span={12}>
                <Card
                  style={{ borderRadius: 12, border: alt.esMejorVPN ? '2px solid #991B1B' : '1px solid #e5e7eb' }}
                  title={
                    <Space>
                      <Text strong style={{ color: alt.esMejorVPN ? COLOR_PRIMARY : '#374151' }}>{alt.label}</Text>
                      {alt.esMejorVPN && <Tag color="#991B1B" icon={<TrophyOutlined />}>Recomendada</Tag>}
                    </Space>
                  }
                >
                  <Row gutter={8} style={{ marginBottom: 8 }}>
                    <Col span={8}>
                      <div style={{ background: alt.dec === 'ACEPTAR' ? '#dcfce7' : '#fee2e2', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                        <Text style={{ fontSize: 9, color: '#6b7280', display: 'block' }}>VPN</Text>
                        <Text strong style={{ fontSize: 12, color: alt.dec === 'ACEPTAR' ? '#15803d' : '#dc2626' }}>{fmtMoneda(alt.vpn)}</Text>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ background: alt.cae >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                        <Text style={{ fontSize: 9, color: '#6b7280', display: 'block' }}>CAE</Text>
                        <Text strong style={{ fontSize: 12, color: alt.cae >= 0 ? '#15803d' : '#dc2626' }}>{fmtMoneda(alt.cae)}</Text>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div style={{ background: alt.tirDec === 'ACEPTAR' ? '#dcfce7' : '#fee2e2', borderRadius: 8, padding: '8px 6px', textAlign: 'center' }}>
                        <Text style={{ fontSize: 9, color: '#6b7280', display: 'block' }}>TIR</Text>
                        <Text strong style={{ fontSize: 12, color: alt.tirDec === 'ACEPTAR' ? '#15803d' : '#dc2626' }}>{fmtPct(alt.tir)}</Text>
                      </div>
                    </Col>
                  </Row>
                  <div style={{ textAlign: 'center' }}>
                    <span className={alt.dec === 'ACEPTAR' ? 'badge-aceptar' : 'badge-rechazar'}>
                      {alt.dec === 'ACEPTAR' ? '✓' : '✗'} VPN: {alt.dec}
                    </span>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <Alert
            type={resultado.vpnA.decision === 'RECHAZAR' && resultado.vpnB.decision === 'RECHAZAR' ? 'error' : 'success'}
            showIcon
            icon={<TrophyOutlined />}
            message="Recomendación del Sistema"
            description={resultado.recomendacion}
            style={{ borderRadius: 10, fontSize: 14 }}
          />

          {/* Gráficas comparativas */}
          <Row gutter={16}>
            {/* VPN + CAE */}
            <Col xs={24} md={14}>
              <Card title={<Text strong>VPN y CAE — Comparación</Text>} style={{ borderRadius: 12 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={[
                      { metodo: 'VPN', 'Alt. A': Math.round(resultado.vpnA.vpn * 100) / 100, 'Alt. B': Math.round(resultado.vpnB.vpn * 100) / 100 },
                      { metodo: 'CAE', 'Alt. A': Math.round(resultado.caeA * 100) / 100, 'Alt. B': Math.round(resultado.caeB * 100) / 100 },
                    ]}
                    margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="metodo" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <RechartTooltip formatter={(v: number) => fmtMoneda(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={0} stroke="#9ca3af" />
                    <Bar dataKey="Alt. A" fill={COLOR_PRIMARY} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Alt. B" fill="#374151" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>

            {/* TIR */}
            <Col xs={24} md={10}>
              <Card title={<Text strong>TIR — Comparación</Text>} style={{ borderRadius: 12 }}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={[
                      { alt: 'Alt. A', TIR: Math.round(resultado.tirA.tir * 100) / 100 },
                      { alt: 'Alt. B', TIR: Math.round(resultado.tirB.tir * 100) / 100 },
                    ]}
                    margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="alt" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 10 }} />
                    <RechartTooltip formatter={(v: number) => [`${v}%`, 'TIR']} />
                    <ReferenceLine
                      y={resultado.alternativaA.tasaPorcentaje}
                      stroke="#3b82f6"
                      strokeDasharray="4 3"
                      label={{ value: `TMAR ${resultado.alternativaA.tasaPorcentaje}%`, position: 'right', fontSize: 9, fill: '#3b82f6' }}
                    />
                    <Bar dataKey="TIR" radius={[3, 3, 0, 0]}
                      fill={COLOR_PRIMARY}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </Col>
          </Row>

          {/* Tabla comparativa */}
          <Card title={<Text strong>Tabla Comparativa Detallada</Text>} style={{ borderRadius: 12 }}>
            {/* Cabecera */}
            <Row style={{ padding: '6px 0 10px', borderBottom: '2px solid #e5e7eb' }}>
              <Col span={8}><Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: 700 }}>CONCEPTO</Text></Col>
              <Col span={8} style={{ textAlign: 'center' }}><Text style={{ fontSize: 12, color: COLOR_PRIMARY, fontWeight: 700 }}>ALTERNATIVA A</Text></Col>
              <Col span={8} style={{ textAlign: 'center' }}><Text style={{ fontSize: 12, color: '#374151', fontWeight: 700 }}>ALTERNATIVA B</Text></Col>
            </Row>
            {[
              { concepto: 'Inversión Inicial',      a: fmtMoneda(formA.getFieldValue('inversion')),    b: fmtMoneda(formB.getFieldValue('inversion')) },
              { concepto: 'Tasa TMAR',              a: `${formA.getFieldValue('tasa')}%`,              b: `${formB.getFieldValue('tasa')}%` },
              { concepto: 'Vida Útil',              a: `${flujosA.length} años`,                       b: `${flujosB.length} años` },
              { concepto: 'Valor Residual',         a: fmtMoneda(formA.getFieldValue('residual')),     b: fmtMoneda(formB.getFieldValue('residual')) },
              { concepto: 'VPN Calculado',          a: fmtMoneda(resultado.vpnA.vpn),                  b: fmtMoneda(resultado.vpnB.vpn) },
              { concepto: 'Decisión VPN',           a: resultado.vpnA.decision,                         b: resultado.vpnB.decision },
              { concepto: 'CAE Calculado',          a: fmtMoneda(resultado.caeA),                       b: fmtMoneda(resultado.caeB) },
              { concepto: 'TIR Calculada',          a: fmtPct(resultado.tirA.tir),                     b: fmtPct(resultado.tirB.tir) },
              { concepto: 'Decisión TIR',           a: resultado.tirA.decision,                         b: resultado.tirB.decision },
              { concepto: 'RECOMENDACIÓN',          a: resultado.mejorVPN === 'Alternativa A' ? '★ ELEGIDA' : '', b: resultado.mejorVPN === 'Alternativa B' ? '★ ELEGIDA' : '' },
            ].map(row => (
              <Row key={row.concepto} style={{ padding: '7px 0', borderBottom: '1px solid #f3f4f6' }} align="middle">
                <Col span={8}><Text style={{ fontSize: 13, color: '#6b7280' }}>{row.concepto}</Text></Col>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <Text style={{
                    fontSize: 13,
                    color: row.concepto === 'RECOMENDACIÓN' && resultado.mejorVPN === 'Alternativa A' ? COLOR_PRIMARY :
                           (row.concepto === 'Decisión VPN' || row.concepto === 'Decisión TIR') && row.a === 'ACEPTAR' ? '#15803d' :
                           (row.concepto === 'Decisión VPN' || row.concepto === 'Decisión TIR') && row.a === 'RECHAZAR' ? '#dc2626' : '#374151',
                    fontWeight: row.concepto === 'RECOMENDACIÓN' ? 700 : 400,
                  }}>{row.a}</Text>
                </Col>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <Text style={{
                    fontSize: 13,
                    color: row.concepto === 'RECOMENDACIÓN' && resultado.mejorVPN === 'Alternativa B' ? COLOR_PRIMARY :
                           (row.concepto === 'Decisión VPN' || row.concepto === 'Decisión TIR') && row.b === 'ACEPTAR' ? '#15803d' :
                           (row.concepto === 'Decisión VPN' || row.concepto === 'Decisión TIR') && row.b === 'RECHAZAR' ? '#dc2626' : '#374151',
                    fontWeight: row.concepto === 'RECOMENDACIÓN' ? 700 : 400,
                  }}>{row.b}</Text>
                </Col>
              </Row>
            ))}
          </Card>
        </Space>
      )}
    </div>
  );
}
