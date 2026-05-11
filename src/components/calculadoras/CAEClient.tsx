'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, Form, InputNumber, Button, Row, Col, Alert, Typography, Space, Tooltip } from 'antd';
import { LineChartOutlined, InfoCircleOutlined, ReloadOutlined, CalculatorOutlined, FilePdfOutlined } from '@ant-design/icons';
import { calcularCAE, fmtMoneda, rd4, factorAP } from '@/lib/formulas';
import { guardar, cargar, CLAVES } from '@/lib/storage';
import { COLOR_PRIMARY } from '@/config/antd-theme';
import { exportCAEPDF } from '@/lib/exportPDF';

const { Text } = Typography;

interface FormValues {
  costoInicial:    number;
  tasaDescuento:   number;
  vida:            number;
  costosAnuales:   number;
  valorSalvamento: number;
}

const DEFAULT: FormValues = {
  costoInicial:    80000,
  tasaDescuento:   12,
  vida:            5,
  costosAnuales:   8000,
  valorSalvamento: 10000,
};

export default function CAEClient() {
  const [form]      = Form.useForm<FormValues>();
  const [resultado, setResultado] = useState<ReturnType<typeof calcularCAE> | null>(null);

  useEffect(() => {
    form.setFieldsValue(cargar(CLAVES.cae, DEFAULT));
  }, [form]);

  const calcular = useCallback(() => {
    const v = form.getFieldsValue();
    const r = calcularCAE(v.costoInicial, v.tasaDescuento, v.vida, v.costosAnuales, v.valorSalvamento);
    setResultado(r);
    guardar(CLAVES.cae, v);
  }, [form]);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon"><LineChartOutlined /></div>
        <div>
          <div className="page-header-title">Costo Anual Equivalente (CAE)</div>
          <div className="page-header-sub">
            Convierte todos los costos del proyecto a una anualidad equivalente. Ideal para comparar alternativas con distinta vida útil.
          </div>
        </div>
      </div>

      <div className="formula-box" style={{ marginBottom: 20 }}>
        <div className="formula-text">CAE = VPN × FRC = VPN × [i(1+i)ⁿ / ((1+i)ⁿ − 1)]</div>
        <div className="formula-desc">
          FRC = Factor de Recuperación de Capital &nbsp;|&nbsp;
          Se selecciona la alternativa con mayor CAE (si hay ingresos) o menor CAE absoluto (si son solo costos)
        </div>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={10}>
          <Card
            title={<Text strong style={{ color: COLOR_PRIMARY }}>Datos del Proyecto</Text>}
            style={{ borderRadius: 12 }}
            extra={
              <Tooltip title="Reiniciar">
                <Button size="small" icon={<ReloadOutlined />} onClick={() => { form.setFieldsValue(DEFAULT); setResultado(null); }} />
              </Tooltip>
            }
          >
            <Form form={form} layout="vertical">
              <Form.Item name="costoInicial" label="Costo / Inversión Inicial" rules={[{ required: true }]}>
                <InputNumber<number>
                  min={0} step={1000} prefix="$" style={{ width: '100%' }}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => Number(v?.replace(/,/g, ''))}
                />
              </Form.Item>

              <Form.Item
                name="tasaDescuento"
                label={
                  <Space>
                    Tasa de Descuento TMAR (%)
                    <Tooltip title="Tasa de descuento usada para calcular el VPN equivalente.">
                      <InfoCircleOutlined style={{ color: '#9ca3af' }} />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true }]}
              >
                <InputNumber min={0.01} max={1000} step={0.5} suffix="%" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="vida" label="Vida Útil del Proyecto (años)" rules={[{ required: true }]}>
                <InputNumber min={1} max={100} step={1} style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item
                name="costosAnuales"
                label={
                  <Space>
                    Costos Anuales de Operación
                    <Tooltip title="Costos recurrentes por año (mantenimiento, operación, etc.). Se toman como egresos.">
                      <InfoCircleOutlined style={{ color: '#9ca3af' }} />
                    </Tooltip>
                  </Space>
                }
              >
                <InputNumber<number>
                  min={0} step={500} prefix="$" style={{ width: '100%' }}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => Number(v?.replace(/,/g, ''))}
                />
              </Form.Item>

              <Form.Item name="valorSalvamento" label="Valor de Salvamento (al final de la vida útil)">
                <InputNumber<number>
                  min={0} step={500} prefix="$" style={{ width: '100%' }}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => Number(v?.replace(/,/g, ''))}
                />
              </Form.Item>

              <Button
                type="primary" block size="large" icon={<CalculatorOutlined />}
                onClick={calcular}
                style={{ background: COLOR_PRIMARY, borderColor: COLOR_PRIMARY, fontWeight: 700 }}
              >
                Calcular CAE
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={14}>
          {resultado ? (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              {/* Botón descargar PDF */}
              <Button
                icon={<FilePdfOutlined />}
                onClick={() => exportCAEPDF(resultado, {
                  costoInicial:    form.getFieldValue('costoInicial') ?? 0,
                  tasaDescuento:   form.getFieldValue('tasaDescuento') ?? 0,
                  vida:            form.getFieldValue('vida') ?? 0,
                  costosAnuales:   form.getFieldValue('costosAnuales') ?? 0,
                  valorSalvamento: form.getFieldValue('valorSalvamento') ?? 0,
                })}
                style={{ borderColor: COLOR_PRIMARY, color: COLOR_PRIMARY, fontWeight: 600 }}
              >
                Descargar PDF
              </Button>

              <Row gutter={12}>
                <Col span={12}>
                  <Card className="kpi-result" style={{ borderRadius: 12 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600 }}>COSTO ANUAL EQUIVALENTE</Text>
                    <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginTop: 4 }}>
                      {fmtMoneda(resultado.cae)}
                    </div>
                    <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>por año</Text>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card className="kpi-neutral" style={{ borderRadius: 12 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600 }}>VPN CALCULADO</Text>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginTop: 4 }}>
                      {fmtMoneda(resultado.vpn)}
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* Desglose */}
              <Card title={<Text strong>Desglose del Cálculo</Text>} style={{ borderRadius: 12 }}>
                {[
                  { label: 'Inversión inicial',         val: fmtMoneda(form.getFieldValue('costoInicial')) },
                  { label: 'Costos anuales de operación', val: fmtMoneda(form.getFieldValue('costosAnuales')) },
                  { label: 'Valor de salvamento',       val: fmtMoneda(form.getFieldValue('valorSalvamento')) },
                  { label: 'Tasa de descuento (i)',     val: `${form.getFieldValue('tasaDescuento')}%` },
                  { label: 'Vida útil (n)',              val: `${form.getFieldValue('vida')} años` },
                  { label: 'VPN equivalente',           val: fmtMoneda(resultado.vpn) },
                  { label: 'Factor FRC (A/P, i, n)',    val: rd4(resultado.frc).toFixed(4) },
                  { label: 'CAE = VPN × FRC',           val: <strong style={{ color: COLOR_PRIMARY }}>{fmtMoneda(resultado.cae)}</strong> },
                ].map(row => (
                  <Row key={row.label} style={{ padding: '7px 0', borderBottom: '1px solid #f3f4f6' }}>
                    <Col span={16}><Text style={{ fontSize: 13, color: '#374151' }}>{row.label}</Text></Col>
                    <Col span={8} style={{ textAlign: 'right' }}><Text style={{ fontSize: 13 }}>{row.val}</Text></Col>
                  </Row>
                ))}
              </Card>

              <Alert
                type="info"
                showIcon
                message="Criterio de selección CAE"
                description="Cuando se comparan alternativas usando CAE, se debe seleccionar la alternativa con mayor CAE si representa beneficios netos, o con menor CAE absoluto si representa solo costos."
                style={{ borderRadius: 10 }}
              />

              <Card style={{ borderRadius: 12, background: '#FEF2F2', border: '1px solid #fecaca' }}>
                <Text style={{ fontSize: 12, color: '#7F1D1D' }}>
                  <strong>Fórmula aplicada:</strong><br />
                  FRC = i(1+i)ⁿ / ((1+i)ⁿ − 1) = {rd4(resultado.frc).toFixed(6)}<br />
                  CAE = {fmtMoneda(resultado.vpn)} × {rd4(resultado.frc).toFixed(4)} = <strong>{fmtMoneda(resultado.cae)}</strong>
                </Text>
              </Card>
            </Space>
          ) : (
            <Card style={{ borderRadius: 12, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                <LineChartOutlined style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }} />
                <br />
                <Text style={{ color: '#9ca3af' }}>Complete los datos y presione <strong>Calcular CAE</strong></Text>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
