'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Form, InputNumber, Button, Row, Col, Alert, Typography, Space, Divider, Tag } from 'antd';
import { SwapOutlined, PlusOutlined, DeleteOutlined, ReloadOutlined, TrophyOutlined, FilePdfOutlined } from '@ant-design/icons';
import { compararAlternativas, fmtMoneda, fmtPct, type ResultadoComparacion } from '@/lib/formulas';
import { guardar, cargar, CLAVES } from '@/lib/storage';
import { COLOR_PRIMARY } from '@/config/antd-theme';
import { exportComparacionPDF } from '@/lib/exportPDF';

const { Text, Title } = Typography;

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
          <div className="page-header-sub">Evalúa dos proyectos simultáneamente con VPN y TIR para identificar la mejor opción.</div>
        </div>
      </div>

      <div className="formula-box" style={{ marginBottom: 20 }}>
        <div className="formula-text">Seleccionar: max(VPN) si ambas viables | TIR {'>'} TMAR en cada alternativa</div>
        <div className="formula-desc">VPN: elige el mayor valor &nbsp;|&nbsp; TIR: elige la mayor tasa interna &nbsp;|&nbsp; Ambas deben ser {'>'} 0 para ser viables</div>
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
          {/* Botón descargar PDF */}
          <Button
            icon={<FilePdfOutlined />}
            onClick={() => exportComparacionPDF(resultado)}
            style={{ borderColor: COLOR_PRIMARY, color: COLOR_PRIMARY, fontWeight: 600 }}
          >
            Descargar PDF
          </Button>

          {/* Resultados lado a lado */}
          <Row gutter={12}>
            {[
              { label: 'Alternativa A', vpn: resultado.vpnA.vpn, dec: resultado.vpnA.decision, tir: resultado.tirA.tir, tirDec: resultado.tirA.decision, esMejor: resultado.mejorVPN === 'Alternativa A' },
              { label: 'Alternativa B', vpn: resultado.vpnB.vpn, dec: resultado.vpnB.decision, tir: resultado.tirB.tir, tirDec: resultado.tirB.decision, esMejor: resultado.mejorVPN === 'Alternativa B' },
            ].map(alt => (
              <Col key={alt.label} span={12}>
                <Card
                  style={{ borderRadius: 12, border: alt.esMejor ? '2px solid #991B1B' : '1px solid #e5e7eb' }}
                  title={
                    <Space>
                      <Text strong style={{ color: alt.esMejor ? COLOR_PRIMARY : '#374151' }}>{alt.label}</Text>
                      {alt.esMejor && <Tag color="#991B1B" icon={<TrophyOutlined />}>Recomendada</Tag>}
                    </Space>
                  }
                >
                  <Row gutter={8} style={{ marginBottom: 12 }}>
                    <Col span={12}>
                      <div style={{ background: alt.dec === 'ACEPTAR' ? '#dcfce7' : '#fee2e2', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                        <Text style={{ fontSize: 10, color: '#6b7280', display: 'block' }}>VPN</Text>
                        <Text strong style={{ fontSize: 15, color: alt.dec === 'ACEPTAR' ? '#15803d' : '#dc2626' }}>{fmtMoneda(alt.vpn)}</Text>
                      </div>
                    </Col>
                    <Col span={12}>
                      <div style={{ background: alt.tirDec === 'ACEPTAR' ? '#dcfce7' : '#fee2e2', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                        <Text style={{ fontSize: 10, color: '#6b7280', display: 'block' }}>TIR</Text>
                        <Text strong style={{ fontSize: 15, color: alt.tirDec === 'ACEPTAR' ? '#15803d' : '#dc2626' }}>{fmtPct(alt.tir)}</Text>
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

          {/* Tabla comparativa */}
          <Card title={<Text strong>Tabla Comparativa Detallada</Text>} style={{ borderRadius: 12 }}>
            {[
              { concepto: 'Inversión Inicial',      a: fmtMoneda(formA.getFieldValue('inversion')),    b: fmtMoneda(formB.getFieldValue('inversion')) },
              { concepto: 'Tasa TMAR',              a: `${formA.getFieldValue('tasa')}%`,              b: `${formB.getFieldValue('tasa')}%` },
              { concepto: 'Vida Útil',              a: `${flujosA.length} años`,                       b: `${flujosB.length} años` },
              { concepto: 'Valor Residual',         a: fmtMoneda(formA.getFieldValue('residual')),     b: fmtMoneda(formB.getFieldValue('residual')) },
              { concepto: 'VPN Calculado',          a: fmtMoneda(resultado.vpnA.vpn),                  b: fmtMoneda(resultado.vpnB.vpn) },
              { concepto: 'Decisión VPN',           a: resultado.vpnA.decision,                         b: resultado.vpnB.decision },
              { concepto: 'TIR Calculada',          a: fmtPct(resultado.tirA.tir),                     b: fmtPct(resultado.tirB.tir) },
              { concepto: 'Decisión TIR',           a: resultado.tirA.decision,                         b: resultado.tirB.decision },
              { concepto: 'RECOMENDACIÓN',          a: resultado.mejorVPN === 'Alternativa A' ? '★ ELEGIDA' : '', b: resultado.mejorVPN === 'Alternativa B' ? '★ ELEGIDA' : '' },
            ].map(row => (
              <Row key={row.concepto} style={{ padding: '7px 0', borderBottom: '1px solid #f3f4f6' }} align="middle">
                <Col span={8}><Text style={{ fontSize: 13, color: '#6b7280' }}>{row.concepto}</Text></Col>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: 13, color: resultado.mejorVPN === 'Alternativa A' && row.concepto === 'RECOMENDACIÓN' ? COLOR_PRIMARY : '#374151', fontWeight: row.concepto === 'RECOMENDACIÓN' ? 700 : 400 }}>{row.a}</Text>
                </Col>
                <Col span={8} style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: 13, color: resultado.mejorVPN === 'Alternativa B' && row.concepto === 'RECOMENDACIÓN' ? COLOR_PRIMARY : '#374151', fontWeight: row.concepto === 'RECOMENDACIÓN' ? 700 : 400 }}>{row.b}</Text>
                </Col>
              </Row>
            ))}
          </Card>
        </Space>
      )}
    </div>
  );
}
