'use client';

import { useState } from 'react';
import { Card, InputNumber, Table, Typography, Row, Col, Select, Space, Tag, Button } from 'antd';
import { TableOutlined, PrinterOutlined } from '@ant-design/icons';
import { generarTablaFactores, rd4, type FilaFactor } from '@/lib/formulas';
import { COLOR_PRIMARY } from '@/config/antd-theme';

const { Text } = Typography;

const TASAS_COMUNES = [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 10, 12, 15, 18, 20, 25, 30];

const FACTORES_INFO = [
  { key: 'FP', label: 'F/P',  nombre: 'Factor Valor Futuro',     formula: '(1+i)ⁿ',                       desc: 'Convierte un pago único presente en futuro' },
  { key: 'PF', label: 'P/F',  nombre: 'Factor Valor Presente',   formula: '1 / (1+i)ⁿ',                   desc: 'Convierte un pago único futuro en presente' },
  { key: 'AF', label: 'A/F',  nombre: 'Fondo Acumulativo',       formula: 'i / [(1+i)ⁿ − 1]',             desc: 'Cuota para acumular F en n períodos' },
  { key: 'AP', label: 'A/P',  nombre: 'Recuperación de Capital', formula: 'i(1+i)ⁿ / [(1+i)ⁿ − 1]',      desc: 'Cuota equivalente a P durante n períodos' },
  { key: 'FA', label: 'F/A',  nombre: 'Valor Futuro de Serie',   formula: '[(1+i)ⁿ − 1] / i',             desc: 'Valor futuro de una serie de pagos A' },
  { key: 'PA', label: 'P/A',  nombre: 'Valor Presente de Serie', formula: '[(1+i)ⁿ − 1] / [i(1+i)ⁿ]',   desc: 'Valor presente de una serie de pagos A' },
];

export default function TablasClient() {
  const [tasa, setTasa] = useState<number>(10);
  const [nMax, setNMax]  = useState<number>(20);
  const [datos, setDatos] = useState<FilaFactor[]>(() => generarTablaFactores(10, 20));

  const actualizar = (t: number, n: number) => {
    setTasa(t);
    setNMax(n);
    setDatos(generarTablaFactores(t, n));
  };

  const columnas = [
    { title: 'n', dataIndex: 'n', width: 52, fixed: 'left' as const, align: 'center' as const, render: (v: number) => <Text strong style={{ color: COLOR_PRIMARY }}>{v}</Text> },
    ...FACTORES_INFO.map(f => ({
      title: (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700, color: '#7F1D1D' }}>{f.label}</div>
          <div style={{ fontSize: 9, color: '#9ca3af' }}>{f.nombre}</div>
        </div>
      ),
      dataIndex: f.key,
      align: 'right' as const,
      render: (v: number) => <code style={{ fontSize: 12 }}>{rd4(v).toFixed(4)}</code>,
    })),
  ];

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon"><TableOutlined /></div>
        <div>
          <div className="page-header-title">Tablas de Factores de Equivalencia</div>
          <div className="page-header-sub">Los 6 factores de conversión para cualquier tasa i y número de períodos n</div>
        </div>
      </div>

      {/* Referencia de fórmulas */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {FACTORES_INFO.map(f => (
          <Col key={f.key} xs={12} md={8} lg={4}>
            <Card size="small" style={{ borderRadius: 10, border: '1px solid #fecaca', background: '#FEF2F2' }}>
              <Text strong style={{ color: COLOR_PRIMARY, fontSize: 14 }}>{f.label}</Text>
              <div style={{ fontSize: 10, color: '#7F1D1D', margin: '2px 0' }}>{f.nombre}</div>
              <code style={{ fontSize: 9, color: '#991B1B', display: 'block', background: 'transparent' }}>{f.formula}</code>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Controles */}
      <Card style={{ borderRadius: 12, marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Text style={{ fontSize: 13, fontWeight: 600, marginRight: 8 }}>Tasa de interés (i):</Text>
          </Col>
          <Col>
            <Space wrap>
              {TASAS_COMUNES.map(t => (
                <Tag
                  key={t}
                  color={tasa === t ? '#991B1B' : 'default'}
                  style={{ cursor: 'pointer', borderRadius: 6, padding: '2px 8px', fontWeight: tasa === t ? 700 : 400 }}
                  onClick={() => actualizar(t, nMax)}
                >
                  {t}%
                </Tag>
              ))}
              <InputNumber
                min={0.01} max={500} step={0.25} size="small"
                value={tasa}
                onChange={v => v && actualizar(v, nMax)}
                suffix="% (personalizada)"
                style={{ width: 160 }}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <Text style={{ fontSize: 13, fontWeight: 600 }}>Períodos (n máx):</Text>
              <Select value={nMax} onChange={v => actualizar(tasa, v)} size="small" style={{ width: 90 }}>
                {[10, 20, 30, 40, 50, 60, 100].map(n => <Select.Option key={n} value={n}>{n}</Select.Option>)}
              </Select>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card
        title={
          <Text strong>
            Tabla de Factores — i = <span style={{ color: COLOR_PRIMARY }}>{tasa}%</span>
          </Text>
        }
        style={{ borderRadius: 12 }}
        extra={
          <Button size="small" icon={<PrinterOutlined />} onClick={() => window.print()}>
            Imprimir
          </Button>
        }
      >
        <Table
          className="tabla-resultado"
          dataSource={datos.map(d => ({ ...d, key: d.n }))}
          columns={columnas}
          size="small"
          pagination={false}
          scroll={{ x: 700 }}
          style={{ fontFamily: 'monospace' }}
        />
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#FEF2F2', borderRadius: 8 }}>
          <Text style={{ fontSize: 11, color: '#7F1D1D' }}>
            <strong>Notación:</strong> (Factor, i, n) — Ejemplo: (F/P, {tasa}%, 5) = {rd4(datos[4]?.FP ?? 0).toFixed(4)} &nbsp;|&nbsp;
            Todos los factores calculados con precisión de 4 decimales.
          </Text>
        </div>
      </Card>
    </div>
  );
}
