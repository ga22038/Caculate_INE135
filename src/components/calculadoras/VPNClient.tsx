'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card, Form, InputNumber, Button, Table, Row, Col,
  Alert, Divider, Typography, Space, Tooltip,
} from 'antd';
import {
  CalculatorOutlined, PlusOutlined, DeleteOutlined,
  InfoCircleOutlined, ReloadOutlined, CheckCircleFilled,
  CloseCircleFilled, MinusCircleFilled, FilePdfOutlined,
} from '@ant-design/icons';
import { calcularVPN, fmtMoneda, rd4, type ResultadoVPN } from '@/lib/formulas';
import { guardar, cargar, CLAVES } from '@/lib/storage';
import { COLOR_PRIMARY } from '@/config/antd-theme';
import { exportVPNPDF } from '@/lib/exportPDF';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const { Title, Text } = Typography;

interface FormValues {
  inversionInicial: number;
  tasaDescuento:    number;
  valorResidual:    number;
  flujos:           number[];
}

const DEFAULT: FormValues = {
  inversionInicial: 50000,
  tasaDescuento:    10,
  valorResidual:    0,
  flujos:           [15000, 18000, 20000, 22000, 25000],
};

export default function VPNClient() {
  const [form]      = Form.useForm<FormValues>();
  const [flujos, setFlujos]   = useState<number[]>(DEFAULT.flujos);
  const [resultado, setResultado] = useState<ResultadoVPN | null>(null);

  // Cargar datos guardados
  useEffect(() => {
    const saved = cargar<FormValues>(CLAVES.vpn, DEFAULT);
    form.setFieldsValue(saved);
    setFlujos(saved.flujos);
  }, [form]);

  const calcular = useCallback(() => {
    const vals = form.getFieldsValue();
    const res  = calcularVPN(
      vals.inversionInicial ?? DEFAULT.inversionInicial,
      vals.tasaDescuento    ?? DEFAULT.tasaDescuento,
      flujos,
      vals.valorResidual    ?? 0,
    );
    setResultado(res);
    guardar(CLAVES.vpn, { ...vals, flujos });
  }, [form, flujos]);

  const agregarFlujo  = () => setFlujos(prev => [...prev, 0]);
  const eliminarFlujo = (idx: number) => setFlujos(prev => prev.filter((_, i) => i !== idx));
  const cambiarFlujo  = (idx: number, val: number | null) =>
    setFlujos(prev => prev.map((f, i) => (i === idx ? (val ?? 0) : f)));

  const resetear = () => {
    form.setFieldsValue(DEFAULT);
    setFlujos(DEFAULT.flujos);
    setResultado(null);
  };

  // Decisión badge
  const DecisionBadge = ({ decision }: { decision: ResultadoVPN['decision'] }) => {
    const conf = {
      ACEPTAR:      { cls: 'badge-aceptar',    icon: <CheckCircleFilled />, txt: 'ACEPTAR el proyecto' },
      RECHAZAR:     { cls: 'badge-rechazar',   icon: <CloseCircleFilled />, txt: 'RECHAZAR el proyecto' },
      INDIFERENTE:  { cls: 'badge-indiferente',icon: <MinusCircleFilled />, txt: 'INDIFERENTE' },
    }[decision];
    return <span className={conf.cls}>{conf.icon} {conf.txt}</span>;
  };

  // Columnas tabla
  const columnas = [
    { title: 'Período (t)', dataIndex: 'periodo',             width: 100, align: 'center' as const },
    { title: 'Flujo de Caja',       dataIndex: 'flujoCaja',  render: (v: number) => fmtMoneda(v), align: 'right' as const },
    { title: 'Factor P/F (i,t)',    dataIndex: 'factorPF',   render: (v: number) => rd4(v).toFixed(4), align: 'right' as const },
    { title: 'Flujo Descontado',    dataIndex: 'flujoCajaDescontado', render: (v: number) => fmtMoneda(v), align: 'right' as const },
  ];

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div className="page-header-icon"><CalculatorOutlined /></div>
        <div>
          <div className="page-header-title">Valor Presente Neto (VPN)</div>
          <div className="page-header-sub">
            Evalúa si un proyecto crea valor al descontar todos los flujos de caja a la tasa TMAR
          </div>
        </div>
      </div>

      {/* Fórmula */}
      <div className="formula-box" style={{ marginBottom: 20 }}>
        <div className="formula-text">VPN = −I₀ + Σ [FCₜ / (1 + i)ᵗ]</div>
        <div className="formula-desc">
          I₀ = Inversión inicial &nbsp;|&nbsp; FCₜ = Flujo de caja en período t &nbsp;|&nbsp;
          i = Tasa de descuento (TMAR) &nbsp;|&nbsp; t = 1 … n
        </div>
      </div>

      <Row gutter={[20, 20]}>
        {/* Formulario */}
        <Col xs={24} lg={10}>
          <Card
            title={<Text strong style={{ color: COLOR_PRIMARY }}>Datos del Proyecto</Text>}
            style={{ borderRadius: 12 }}
            extra={
              <Tooltip title="Reiniciar formulario">
                <Button size="small" icon={<ReloadOutlined />} onClick={resetear} />
              </Tooltip>
            }
          >
            <Form form={form} layout="vertical" size="middle">
              <Form.Item name="inversionInicial" label="Inversión Inicial (I₀)" rules={[{ required: true }]}>
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
                    <Tooltip title="Tasa Mínima Aceptable de Rendimiento. También llamada tasa de oportunidad o costo de capital.">
                      <InfoCircleOutlined style={{ color: '#9ca3af' }} />
                    </Tooltip>
                  </Space>
                }
                rules={[{ required: true }]}
              >
                <InputNumber min={0.01} max={1000} step={0.5} suffix="%" style={{ width: '100%' }} />
              </Form.Item>

              <Form.Item name="valorResidual" label="Valor Residual / Salvamento (al final)">
                <InputNumber<number>
                  min={0} step={500} prefix="$" style={{ width: '100%' }}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={v => Number(v?.replace(/,/g, ''))}
                />
              </Form.Item>

              <Divider style={{ margin: '12px 0' }}>
                <Text style={{ fontSize: 12, color: '#6b7280' }}>Flujos de Caja Anuales</Text>
              </Divider>

              {flujos.map((fc, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, color: '#6b7280', minWidth: 60 }}>Año {idx + 1}</Text>
                  <InputNumber<number>
                    value={fc}
                    onChange={v => cambiarFlujo(idx, v)}
                    prefix="$"
                    style={{ flex: 1 }}
                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={v => Number(v?.replace(/,/g, ''))}
                  />
                  <Button
                    size="small" danger icon={<DeleteOutlined />}
                    onClick={() => eliminarFlujo(idx)}
                    disabled={flujos.length <= 1}
                  />
                </div>
              ))}

              <Button
                type="dashed" block icon={<PlusOutlined />}
                onClick={agregarFlujo}
                style={{ marginTop: 4, marginBottom: 16 }}
              >
                Agregar período
              </Button>

              <Button
                type="primary" block size="large" icon={<CalculatorOutlined />}
                onClick={calcular}
                style={{ background: COLOR_PRIMARY, borderColor: COLOR_PRIMARY, fontWeight: 700 }}
              >
                Calcular VPN
              </Button>
            </Form>
          </Card>
        </Col>

        {/* Resultados */}
        <Col xs={24} lg={14}>
          {resultado ? (
            <Space direction="vertical" style={{ width: '100%' }} size={16}>
              {/* Botón descargar PDF */}
              <Button
                icon={<FilePdfOutlined />}
                onClick={() => exportVPNPDF(resultado, {
                  inversionInicial: form.getFieldValue('inversionInicial') ?? 0,
                  tasaDescuento: form.getFieldValue('tasaDescuento') ?? 0,
                  valorResidual: form.getFieldValue('valorResidual') ?? 0,
                })}
                style={{ borderColor: COLOR_PRIMARY, color: COLOR_PRIMARY, fontWeight: 600 }}
              >
                Descargar PDF
              </Button>

              {/* KPIs */}
              <Row gutter={12}>
                <Col span={12}>
                  <Card className={resultado.vpn >= 0 ? 'kpi-result' : 'kpi-rechazar'} style={{ borderRadius: 12 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600 }}>VALOR PRESENTE NETO</Text>
                    <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', marginTop: 4 }}>
                      {fmtMoneda(resultado.vpn)}
                    </div>
                  </Card>
                </Col>
                <Col span={12}>
                  <Card
                    className={
                      resultado.decision === 'ACEPTAR' ? 'kpi-aceptar' :
                      resultado.decision === 'RECHAZAR' ? 'kpi-rechazar' : 'kpi-indiferente'
                    }
                    style={{ borderRadius: 12 }}
                  >
                    <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 600 }}>DECISIÓN</Text>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginTop: 4 }}>
                      {resultado.decision}
                    </div>
                  </Card>
                </Col>
              </Row>

              {/* Alert interpretación */}
              <Alert
                type={resultado.decision === 'ACEPTAR' ? 'success' : resultado.decision === 'RECHAZAR' ? 'error' : 'warning'}
                icon={
                  resultado.decision === 'ACEPTAR' ? <CheckCircleFilled /> :
                  resultado.decision === 'RECHAZAR' ? <CloseCircleFilled /> : <MinusCircleFilled />
                }
                showIcon
                message={
                  resultado.decision === 'ACEPTAR'
                    ? `El proyecto AGREGA valor: VPN = ${fmtMoneda(resultado.vpn)} > $0. Se recomienda invertir.`
                    : resultado.decision === 'RECHAZAR'
                    ? `El proyecto DESTRUYE valor: VPN = ${fmtMoneda(resultado.vpn)} < $0. No se recomienda invertir.`
                    : `El proyecto es INDIFERENTE: VPN ≈ $0. Retorno igual a la tasa de descuento (${resultado.tasaUsada}%).`
                }
                style={{ borderRadius: 10 }}
              />

              {/* Tabla de flujos descontados */}
              {/* Gráfica de flujos */}
              <Card title={<Text strong>Gráfica — Flujos Originales vs Descontados</Text>} style={{ borderRadius: 12 }}>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={resultado.filas.map(f => ({
                      periodo: `t=${f.periodo}`,
                      'Flujo Original': f.flujoCaja,
                      'Flujo Descontado': Math.round(f.flujoCajaDescontado * 100) / 100,
                    }))}
                    margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                    <RechartTooltip formatter={(v: number) => fmtMoneda(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={0} stroke="#9ca3af" />
                    <Bar dataKey="Flujo Original" fill="#9ca3af" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="Flujo Descontado" fill={COLOR_PRIMARY} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              <Card title={<Text strong>Tabla de Flujos Descontados</Text>} style={{ borderRadius: 12 }}>
                <Table
                  className="tabla-resultado"
                  dataSource={resultado.filas.map(f => ({ ...f, key: f.periodo }))}
                  columns={columnas}
                  size="small"
                  pagination={false}
                  summary={() => (
                    <Table.Summary.Row style={{ background: '#FEF2F2', fontWeight: 700 }}>
                      <Table.Summary.Cell index={0} align="center">Total</Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right">
                        {fmtMoneda(resultado.filas.reduce((s, f) => s + f.flujoCaja, 0))}
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={2} align="right">—</Table.Summary.Cell>
                      <Table.Summary.Cell index={3} align="right">
                        <span style={{ color: resultado.vpn >= 0 ? '#15803d' : '#dc2626' }}>
                          {fmtMoneda(resultado.filas.reduce((s, f) => s + f.flujoCajaDescontado, 0))}
                        </span>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                />
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#f9fafb', borderRadius: 8 }}>
                  <Text style={{ fontSize: 12, color: '#6b7280' }}>
                    VPN = −${(form.getFieldValue('inversionInicial') ?? 0).toLocaleString()} (inversión) +{' '}
                    {fmtMoneda(resultado.filas.reduce((s, f) => s + f.flujoCajaDescontado, 0))} (suma descontada) ={' '}
                    <strong style={{ color: resultado.vpn >= 0 ? '#15803d' : '#dc2626' }}>
                      {fmtMoneda(resultado.vpn)}
                    </strong>
                  </Text>
                </div>
              </Card>
            </Space>
          ) : (
            <Card style={{ borderRadius: 12, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', padding: 40, color: '#9ca3af' }}>
                <CalculatorOutlined style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }} />
                <br />
                <Text style={{ color: '#9ca3af' }}>
                  Complete los datos y presione <strong>Calcular VPN</strong>
                </Text>
              </div>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}
