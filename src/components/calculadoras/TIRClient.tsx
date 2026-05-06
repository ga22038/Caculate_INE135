'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Form, InputNumber, Button, Row, Col, Alert, Typography, Space, Tooltip } from 'antd';
import { RiseOutlined, PlusOutlined, DeleteOutlined, InfoCircleOutlined, ReloadOutlined, CalculatorOutlined, CheckCircleFilled, CloseCircleFilled, MinusCircleFilled } from '@ant-design/icons';
import { calcularTIR, calcularVPN, fmtPct, fmtMoneda, type ResultadoTIR } from '@/lib/formulas';
import { guardar, cargar, CLAVES } from '@/lib/storage';
import { COLOR_PRIMARY } from '@/config/antd-theme';

const { Text } = Typography;

interface FormValues { inversionInicial: number; tasaMinima: number; valorResidual: number; flujos: number[]; }
const DEFAULT: FormValues = { inversionInicial: 60000, tasaMinima: 12, valorResidual: 5000, flujos: [18000, 22000, 25000, 28000, 30000] };

export default function TIRClient() {
  const [form]    = Form.useForm<FormValues>();
  const [flujos, setFlujos]     = useState<number[]>(DEFAULT.flujos);
  const [resultado, setResultado] = useState<ResultadoTIR | null>(null);

  useEffect(() => {
    const s = cargar<FormValues>(CLAVES.tir, DEFAULT);
    form.setFieldsValue(s);
    setFlujos(s.flujos);
  }, [form]);

  const calcular = useCallback(() => {
    const v = form.getFieldsValue();
    const r = calcularTIR(v.inversionInicial, flujos, v.tasaMinima, v.valorResidual);
    setResultado(r);
    guardar(CLAVES.tir, { ...v, flujos });
  }, [form, flujos]);

  const DecisionBadge = ({ d }: { d: ResultadoTIR['decision'] }) => {
    if (d === 'NO_CONVERGE') return <span className="badge-indiferente"><MinusCircleFilled /> Sin solución</span>;
    const c = { ACEPTAR: 'badge-aceptar', RECHAZAR: 'badge-rechazar', INDIFERENTE: 'badge-indiferente' }[d];
    const icons = { ACEPTAR: <CheckCircleFilled />, RECHAZAR: <CloseCircleFilled />, INDIFERENTE: <MinusCircleFilled /> };
    return <span className={c}>{icons[d as keyof typeof icons]} {d}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon"><RiseOutlined /></div>
        <div>
          <div className="page-header-title">Tasa Interna de Retorno (TIR)</div>
          <div className="page-header-sub">Calcula la tasa i* que hace VPN = 0. Si TIR {'>'} TMAR → el proyecto es rentable.</div>
        </div>
      </div>

      <div className="formula-box" style={{ marginBottom: 20 }}>
        <div className="formula-text">0 = −I₀ + Σ [FCₜ / (1 + TIR)ᵗ]  →  Despejar TIR</div>
        <div className="formula-desc">
          Se usa el método de bisección numérica para encontrar la tasa TIR que hace VPN = 0 &nbsp;|&nbsp;
          Criterio: TIR {'>'} TMAR → Aceptar
        </div>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={10}>
          <Card
            title={<Text strong style={{ color: COLOR_PRIMARY }}>Datos del Proyecto</Text>}
            style={{ borderRadius: 12 }}
            extra={
              <Tooltip title="Reiniciar">
                <Button size="small" icon={<ReloadOutlined />} onClick={() => { form.setFieldsValue(DEFAULT); setFlujos(DEFAULT.flujos); setResultado(null); }} />
              </Tooltip>
            }
          >
            <Form form={form} layout="vertical">
              <Form.Item name="inversionInicial" label="Inversión Inicial (I₀)" rules={[{ required: true }]}>
                <InputNumber<number> min={0} step={1000} prefix="$" style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => Number(v?.replace(/,/g, ''))} />
              </Form.Item>

              <Form.Item
                name="tasaMinima"
                label={
                  <Space>
                    TMAR — Tasa Mínima Aceptable (%)
                    <Tooltip title="Tasa de comparación. Si TIR > TMAR se acepta el proyecto."><InfoCircleOutlined style={{ color: '#9ca3af' }} /></Tooltip>
                  </Space>
                }
                rules={[{ required: true }]}
              >
                <InputNumber min={0.01} max={1000} step={0.5} suffix="%" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="valorResidual" label="Valor Residual al final">
                <InputNumber<number> min={0} step={500} prefix="$" style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => Number(v?.replace(/,/g, ''))} />
              </Form.Item>

              <div style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>Flujos de Caja Anuales</Text>
              </div>
              {flujos.map((fc, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: '#6b7280', minWidth: 60 }}>Año {idx + 1}</Text>
                  <InputNumber<number> value={fc} onChange={v => setFlujos(p => p.map((f, i) => i === idx ? (v ?? 0) : f))} prefix="$" style={{ flex: 1 }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} parser={v => Number(v?.replace(/,/g, ''))} />
                  <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setFlujos(p => p.filter((_, i) => i !== idx))} disabled={flujos.length <= 1} />
                </div>
              ))}
              <Button type="dashed" block icon={<PlusOutlined />} onClick={() => setFlujos(p => [...p, 0])} style={{ marginTop: 4, marginBottom: 16 }}>
                Agregar período
              </Button>
              <Button type="primary" block size="large" icon={<CalculatorOutlined />} onClick={calcular} style={{ background: COLOR_PRIMARY, borderColor: COLOR_PRIMARY, fontWeight: 700 }}>
                Calcular TIR
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          {resultado ? (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              <Row gutter={12}>
                <Col span={12}>
                  <Card className={resultado.decision === 'ACEPTAR' ? 'kpi-aceptar' : resultado.decision === 'RECHAZAR' ? 'kpi-rechazar' : 'kpi-indiferente'} style={{ borderRadius: 12 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600 }}>TASA INTERNA DE RETORNO</Text>
                    <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', marginTop: 4 }}>
                      {resultado.decision === 'NO_CONVERGE' ? 'N/A' : fmtPct(resultado.tir)}
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card className="kpi-neutral" style={{ borderRadius: 12 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600 }}>TMAR (Referencia)</Text>
                    <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', marginTop: 4 }}>
                      {fmtPct(resultado.tasaMinima)}
                    </div>
                  </Card>
                </Col>
              </Row>

              <Alert
                type={resultado.decision === 'ACEPTAR' ? 'success' : resultado.decision === 'RECHAZAR' ? 'error' : 'warning'}
                showIcon
                message={
                  resultado.decision === 'NO_CONVERGE'
                    ? 'No se encontró TIR válida. Verifique que los flujos incluyan al menos un valor positivo.'
                    : resultado.decision === 'ACEPTAR'
                    ? `TIR (${fmtPct(resultado.tir)}) > TMAR (${fmtPct(resultado.tasaMinima)}) → ACEPTAR el proyecto.`
                    : resultado.decision === 'RECHAZAR'
                    ? `TIR (${fmtPct(resultado.tir)}) < TMAR (${fmtPct(resultado.tasaMinima)}) → RECHAZAR el proyecto.`
                    : `TIR ≈ TMAR → Proyecto INDIFERENTE. Retorno exactamente igual al mínimo requerido.`
                }
                style={{ borderRadius: 10 }}
              />

              <Card title={<Text strong>Comparación TIR vs TMAR</Text>} style={{ borderRadius: 12 }}>
                {[
                  { label: 'Inversión inicial',         val: fmtMoneda(form.getFieldValue('inversionInicial')) },
                  { label: 'Número de períodos',        val: `${flujos.length} años` },
                  { label: 'Valor residual',            val: fmtMoneda(form.getFieldValue('valorResidual')) },
                  { label: 'TMAR (tasa de comparación)', val: fmtPct(resultado.tasaMinima) },
                  { label: 'TIR calculada',             val: resultado.decision === 'NO_CONVERGE' ? 'No converge' : <strong style={{ color: COLOR_PRIMARY, fontSize: 15 }}>{fmtPct(resultado.tir)}</strong> },
                  { label: 'Diferencia TIR − TMAR',     val: resultado.decision === 'NO_CONVERGE' ? '—' : <span style={{ color: resultado.tir >= resultado.tasaMinima ? '#15803d' : '#dc2626', fontWeight: 700 }}>{fmtPct(resultado.tir - resultado.tasaMinima)}</span> },
                  { label: 'Decisión',                  val: <DecisionBadge d={resultado.decision} /> },
                ].map(row => (
                  <Row key={row.label} style={{ padding: '7px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <Col span={16}><Text style={{ fontSize: 13, color: '#374151' }}>{row.label}</Text></Col>
                    <Col span={8} style={{ textAlign: 'right' }}><Text style={{ fontSize: 13 }}>{row.val}</Text></Col>
                  </Row>
                ))}
              </Card>

              <Alert type="info" showIcon message="Método de cálculo" description="La TIR se calcula mediante el método de bisección numérica con 500 iteraciones y precisión de 10⁻⁸. Este método garantiza convergencia cuando existe una única TIR real." style={{ borderRadius: 10 }} />
            </Space>
          ) : (
            <Card style={{ borderRadius: 12, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                <RiseOutlined style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }} />
                <br />
                <Text style={{ color: '#9ca3af' }}>Complete los datos y presione <strong>Calcular TIR</strong></Text>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
