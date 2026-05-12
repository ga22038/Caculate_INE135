'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Card, Form, InputNumber, Button, Row, Col, Alert,
  Typography, Space, Tooltip, Tag, Divider,
} from 'antd';
import {
  LineChartOutlined, InfoCircleOutlined, ReloadOutlined,
  CalculatorOutlined, FilePdfOutlined, TrophyOutlined,
} from '@ant-design/icons';
import { calcularCAE, fmtMoneda, rd4 } from '@/lib/formulas';
import { guardar, cargar, CLAVES } from '@/lib/storage';
import { COLOR_PRIMARY } from '@/config/antd-theme';
import { exportCAEComparacionPDF } from '@/lib/exportPDF';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartTooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';

const { Text } = Typography;

interface FormValues {
  costoInicial:    number;
  tasaDescuento:   number;
  vida:            number;
  costosAnuales:   number;
  valorSalvamento: number;
}

const DEF_A: FormValues = { costoInicial: 80000, tasaDescuento: 12, vida: 5,  costosAnuales: 8000,  valorSalvamento: 10000 };
const DEF_B: FormValues = { costoInicial: 60000, tasaDescuento: 12, vida: 3,  costosAnuales: 12000, valorSalvamento: 5000  };

const COLORES = { A: '#8B0D14', B: '#374151' } as const;

function AltPanel({
  label, color, form, onReset,
}: {
  label: string; color: string;
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
      <Form form={form} layout="vertical">
        <Form.Item name="costoInicial" label="Costo / Inversión Inicial" rules={[{ required: true }]}>
          <InputNumber<number> min={0} step={1000} prefix="$" style={{ width: '100%' }}
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={v => Number(v?.replace(/,/g, ''))} />
        </Form.Item>

        <Form.Item
          name="tasaDescuento"
          label={<Space>Tasa de Descuento TMAR (%)
            <Tooltip title="Tasa de descuento usada para calcular el VPN equivalente.">
              <InfoCircleOutlined style={{ color: '#9ca3af' }} />
            </Tooltip>
          </Space>}
          rules={[{ required: true }]}
        >
          <InputNumber min={0.01} max={1000} step={0.5} suffix="%" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="vida" label={
          <Space>Vida Útil (años)
            <Tooltip title="Puede ser diferente entre alternativas. El CAE las hace comparables.">
              <InfoCircleOutlined style={{ color: '#9ca3af' }} />
            </Tooltip>
          </Space>
        } rules={[{ required: true }]}>
          <InputNumber min={1} max={100} step={1} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="costosAnuales"
          label={<Space>Costos Anuales de Operación
            <Tooltip title="Costos recurrentes por año. Se toman como egresos.">
              <InfoCircleOutlined style={{ color: '#9ca3af' }} />
            </Tooltip>
          </Space>}
        >
          <InputNumber<number> min={0} step={500} prefix="$" style={{ width: '100%' }}
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={v => Number(v?.replace(/,/g, ''))} />
        </Form.Item>

        <Form.Item name="valorSalvamento" label="Valor de Salvamento (al final de la vida útil)">
          <InputNumber<number> min={0} step={500} prefix="$" style={{ width: '100%' }}
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={v => Number(v?.replace(/,/g, ''))} />
        </Form.Item>
      </Form>
    </Card>
  );
}

type ResultCAE = ReturnType<typeof calcularCAE>;

export default function CAEClient() {
  const [formA] = Form.useForm<FormValues>();
  const [formB] = Form.useForm<FormValues>();
  const [resA, setResA] = useState<ResultCAE | null>(null);
  const [resB, setResB] = useState<ResultCAE | null>(null);

  useEffect(() => {
    const s = cargar<{ a: FormValues; b: FormValues }>(CLAVES.cae, { a: DEF_A, b: DEF_B });
    formA.setFieldsValue(s.a ?? DEF_A);
    formB.setFieldsValue(s.b ?? DEF_B);
  }, [formA, formB]);

  const calcular = useCallback(() => {
    const va = formA.getFieldsValue();
    const vb = formB.getFieldsValue();
    const ra = calcularCAE(va.costoInicial, va.tasaDescuento, va.vida, va.costosAnuales, va.valorSalvamento);
    const rb = calcularCAE(vb.costoInicial, vb.tasaDescuento, vb.vida, vb.costosAnuales, vb.valorSalvamento);
    setResA(ra);
    setResB(rb);
    guardar(CLAVES.cae, { a: va, b: vb });
  }, [formA, formB]);

  const resetear = () => {
    formA.setFieldsValue(DEF_A);
    formB.setFieldsValue(DEF_B);
    setResA(null);
    setResB(null);
  };

  const hayResultados = resA !== null && resB !== null;

  // ¿Cuál es mejor?
  // Si ambas positivas → mayor CAE. Si ambas negativas → menor absoluto (menor costo). Si una positiva → esa.
  const mejorLabel = hayResultados
    ? (resA!.cae >= 0 && resB!.cae >= 0)
      ? resA!.cae >= resB!.cae ? 'Alternativa A' : 'Alternativa B'
      : (resA!.cae < 0 && resB!.cae < 0)
        ? Math.abs(resA!.cae) <= Math.abs(resB!.cae) ? 'Alternativa A' : 'Alternativa B'
        : resA!.cae >= 0 ? 'Alternativa A' : 'Alternativa B'
    : null;

  const recomendacion = hayResultados
    ? `Se recomienda ${mejorLabel} con CAE = ${fmtMoneda(mejorLabel === 'Alternativa A' ? resA!.cae : resB!.cae)}.`
    : '';

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon"><LineChartOutlined /></div>
        <div>
          <div className="page-header-title">Costo Anual Equivalente (CAE)</div>
          <div className="page-header-sub">
            Compara dos alternativas convirtiendo sus costos a una anualidad equivalente.
            Ideal cuando tienen <strong>distinta vida útil</strong>.
          </div>
        </div>
      </div>

      <div className="formula-box" style={{ marginBottom: 20 }}>
        <div className="formula-text">CAE = VPN × FRC = VPN × [i(1+i)ⁿ / ((1+i)ⁿ − 1)]</div>
        <div className="formula-desc">
          FRC = Factor de Recuperación de Capital &nbsp;|&nbsp;
          Mayor CAE (ingresos) o menor CAE absoluto (costos) → alternativa preferida
        </div>
      </div>

      {/* Formularios A y B */}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <AltPanel label="Alternativa A" color={COLORES.A} form={formA} onReset={() => { formA.setFieldsValue(DEF_A); setResA(null); setResB(null); }} />
        </Col>
        <Col xs={24} md={12}>
          <AltPanel label="Alternativa B" color={COLORES.B} form={formB} onReset={() => { formB.setFieldsValue(DEF_B); setResA(null); setResB(null); }} />
        </Col>
      </Row>

      <Row gutter={12} style={{ marginTop: 16 }}>
        <Col flex="auto">
          <Button type="primary" block size="large" icon={<CalculatorOutlined />} onClick={calcular}
            style={{ background: COLOR_PRIMARY, borderColor: COLOR_PRIMARY, fontWeight: 700 }}>
            Calcular y Comparar CAE
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
            onClick={() => exportCAEComparacionPDF(
              resA, { costoInicial: formA.getFieldValue('costoInicial') ?? 0, tasaDescuento: formA.getFieldValue('tasaDescuento') ?? 0, vida: formA.getFieldValue('vida') ?? 0, costosAnuales: formA.getFieldValue('costosAnuales') ?? 0, valorSalvamento: formA.getFieldValue('valorSalvamento') ?? 0 },
              resB, { costoInicial: formB.getFieldValue('costoInicial') ?? 0, tasaDescuento: formB.getFieldValue('tasaDescuento') ?? 0, vida: formB.getFieldValue('vida') ?? 0, costosAnuales: formB.getFieldValue('costosAnuales') ?? 0, valorSalvamento: formB.getFieldValue('valorSalvamento') ?? 0 },
              mejorLabel!,
            )}
            style={{ borderColor: COLOR_PRIMARY, color: COLOR_PRIMARY, fontWeight: 600 }}
          >
            Descargar PDF
          </Button>

          {/* KPI cards */}
          <Row gutter={12}>
            {[
              { label: 'Alternativa A', res: resA, color: COLORES.A, inputs: formA },
              { label: 'Alternativa B', res: resB, color: COLORES.B, inputs: formB },
            ].map(({ label, res, color, inputs }) => {
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
                    <Row gutter={8} style={{ marginBottom: 12 }}>
                      <Col span={12}>
                        <div style={{ background: res.cae >= 0 ? '#dcfce7' : '#fee2e2', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                          <Text style={{ fontSize: 10, color: '#6b7280', display: 'block' }}>CAE / AÑO</Text>
                          <Text strong style={{ fontSize: 15, color: res.cae >= 0 ? '#15803d' : '#dc2626' }}>{fmtMoneda(res.cae)}</Text>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ background: '#dbeafe', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                          <Text style={{ fontSize: 10, color: '#6b7280', display: 'block' }}>VPN</Text>
                          <Text strong style={{ fontSize: 15, color: '#1d4ed8' }}>{fmtMoneda(res.vpn)}</Text>
                        </div>
                      </Col>
                    </Row>

                    {/* Desglose compacto */}
                    {[
                      { l: 'Vida útil',   v: `${inputs.getFieldValue('vida')} años` },
                      { l: 'TMAR',        v: `${inputs.getFieldValue('tasaDescuento')}%` },
                      { l: 'FRC (A/P)',   v: rd4(res.frc).toFixed(4) },
                      { l: 'CAE = VPN×FRC', v: <strong style={{ color }}>{fmtMoneda(res.cae)}</strong> },
                    ].map(row => (
                      <Row key={row.l} style={{ padding: '4px 0', borderBottom: '1px solid #f3f4f6' }}>
                        <Col span={14}><Text style={{ fontSize: 12, color: '#6b7280' }}>{row.l}</Text></Col>
                        <Col span={10} style={{ textAlign: 'right' }}><Text style={{ fontSize: 12 }}>{row.v}</Text></Col>
                      </Row>
                    ))}
                  </Card>
                </Col>
              );
            })}
          </Row>

          {/* Recomendación */}
          <Alert
            type="success"
            showIcon
            icon={<TrophyOutlined />}
            message="Recomendación"
            description={recomendacion}
            style={{ borderRadius: 10 }}
          />

          {/* Gráfica comparativa */}
          <Card title={<Text strong>Comparación CAE y VPN</Text>} style={{ borderRadius: 12 }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={[
                  { metodo: 'CAE ($/año)', 'Alternativa A': Math.round(resA.cae * 100) / 100, 'Alternativa B': Math.round(resB.cae * 100) / 100 },
                  { metodo: 'VPN ($)',     'Alternativa A': Math.round(resA.vpn * 100) / 100, 'Alternativa B': Math.round(resB.vpn * 100) / 100 },
                ]}
                margin={{ top: 8, right: 16, left: 8, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="metodo" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} />
                <RechartTooltip formatter={(v: number) => fmtMoneda(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="#9ca3af" />
                <Bar dataKey="Alternativa A" fill={COLORES.A} radius={[3, 3, 0, 0]} />
                <Bar dataKey="Alternativa B" fill={COLORES.B} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Tabla comparativa detallada */}
          <Card title={<Text strong>Tabla Comparativa Detallada</Text>} style={{ borderRadius: 12 }}>
            <Row style={{ padding: '6px 0 10px', borderBottom: '2px solid #e5e7eb' }}>
              <Col span={10}><Text style={{ fontSize: 12, color: '#9ca3af', fontWeight: 700 }}>CONCEPTO</Text></Col>
              <Col span={7} style={{ textAlign: 'center' }}><Text style={{ fontSize: 12, color: COLORES.A, fontWeight: 700 }}>ALTERNATIVA A</Text></Col>
              <Col span={7} style={{ textAlign: 'center' }}><Text style={{ fontSize: 12, color: COLORES.B, fontWeight: 700 }}>ALTERNATIVA B</Text></Col>
            </Row>
            {[
              { concepto: 'Inversión inicial',          a: fmtMoneda(formA.getFieldValue('costoInicial')),    b: fmtMoneda(formB.getFieldValue('costoInicial')) },
              { concepto: 'Costos anuales',             a: fmtMoneda(formA.getFieldValue('costosAnuales')),   b: fmtMoneda(formB.getFieldValue('costosAnuales')) },
              { concepto: 'Valor de salvamento',        a: fmtMoneda(formA.getFieldValue('valorSalvamento')), b: fmtMoneda(formB.getFieldValue('valorSalvamento')) },
              { concepto: 'Tasa TMAR',                  a: `${formA.getFieldValue('tasaDescuento')}%`,        b: `${formB.getFieldValue('tasaDescuento')}%` },
              { concepto: 'Vida útil',                  a: `${formA.getFieldValue('vida')} años`,             b: `${formB.getFieldValue('vida')} años` },
              { concepto: 'VPN calculado',              a: fmtMoneda(resA.vpn),                               b: fmtMoneda(resB.vpn) },
              { concepto: 'FRC (A/P, i, n)',            a: rd4(resA.frc).toFixed(4),                          b: rd4(resB.frc).toFixed(4) },
              { concepto: 'CAE = VPN × FRC',            a: fmtMoneda(resA.cae),                               b: fmtMoneda(resB.cae) },
              { concepto: 'RECOMENDACIÓN',              a: mejorLabel === 'Alternativa A' ? '★ ELEGIDA' : '',  b: mejorLabel === 'Alternativa B' ? '★ ELEGIDA' : '' },
            ].map(row => (
              <Row key={row.concepto} style={{ padding: '7px 0', borderBottom: '1px solid #f3f4f6' }} align="middle">
                <Col span={10}><Text style={{ fontSize: 12, color: '#6b7280' }}>{row.concepto}</Text></Col>
                <Col span={7} style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: row.concepto === 'RECOMENDACIÓN' && row.a ? 700 : 400, color: row.concepto === 'RECOMENDACIÓN' && row.a ? COLORES.A : '#374151' }}>{row.a}</Text>
                </Col>
                <Col span={7} style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: row.concepto === 'RECOMENDACIÓN' && row.b ? 700 : 400, color: row.concepto === 'RECOMENDACIÓN' && row.b ? COLORES.B : '#374151' }}>{row.b}</Text>
                </Col>
              </Row>
            ))}
          </Card>

          <Alert
            type="info"
            showIcon
            message="¿Por qué usar CAE para comparar?"
            description="El CAE convierte el costo total de cada alternativa a una cuota anual uniforme. Esto permite comparar proyectos con DISTINTA vida útil de forma justa, ya que ambos quedan expresados en la misma unidad: costo por año."
            style={{ borderRadius: 10 }}
          />
        </Space>
      )}

      {!hayResultados && (
        <Card style={{ borderRadius: 12, marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>
            <LineChartOutlined style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }} />
            <br />
            <Text style={{ color: '#9ca3af' }}>
              Complete los datos de ambas alternativas y presione <strong>Calcular y Comparar CAE</strong>
            </Text>
          </div>
        </Card>
      )}
    </div>
  );
}
