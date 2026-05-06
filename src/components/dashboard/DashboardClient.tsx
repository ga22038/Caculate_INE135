'use client';

import { Card, Col, Row, Typography, Button, Badge } from 'antd';
import {
  CalculatorOutlined, LineChartOutlined, RiseOutlined,
  SwapOutlined, TableOutlined, BookOutlined,
  ArrowRightOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import { COLOR_PRIMARY, COLOR_PRIMARY_LIGHT } from '@/config/antd-theme';

const { Title, Text, Paragraph } = Typography;

const MODULOS = [
  {
    href:        '/vpn',
    icon:        <CalculatorOutlined style={{ fontSize: 28 }} />,
    titulo:      'VPN',
    subtitulo:   'Valor Presente Neto',
    desc:        'Calcula el valor presente de todos los flujos de caja descontados a la tasa TMAR. Criterio: VPN > 0 → Aceptar.',
    formula:     'VPN = −I₀ + Σ [FCₜ / (1+i)ᵗ]',
    color:       '#991B1B',
  },
  {
    href:        '/cae',
    icon:        <LineChartOutlined style={{ fontSize: 28 }} />,
    titulo:      'CAE',
    subtitulo:   'Costo Anual Equivalente',
    desc:        'Convierte todos los costos e ingresos del proyecto a una anualidad equivalente. Útil para comparar proyectos de diferente vida útil.',
    formula:     'CAE = VPN × [i(1+i)ⁿ / ((1+i)ⁿ − 1)]',
    color:       '#7F1D1D',
  },
  {
    href:        '/tir',
    icon:        <RiseOutlined style={{ fontSize: 28 }} />,
    titulo:      'TIR',
    subtitulo:   'Tasa Interna de Retorno',
    desc:        'Encuentra la tasa i* que hace VPN = 0. Criterio: TIR > TMAR → Aceptar el proyecto.',
    formula:     '0 = −I₀ + Σ [FCₜ / (1+TIR)ᵗ]',
    color:       '#6B1111',
  },
  {
    href:        '/comparar',
    icon:        <SwapOutlined style={{ fontSize: 28 }} />,
    titulo:      'Comparar',
    subtitulo:   'Comparación de Alternativas',
    desc:        'Evalúa dos alternativas simultáneamente con VPN y TIR para recomendar la más conveniente.',
    formula:     'Seleccionar: max(VPN) y max(TIR)',
    color:       '#991B1B',
  },
  {
    href:        '/tablas',
    icon:        <TableOutlined style={{ fontSize: 28 }} />,
    titulo:      'Tablas',
    subtitulo:   'Factores de Equivalencia',
    desc:        'Consulta los 6 factores de equivalencia (F/P, P/F, A/F, A/P, F/A, P/A) para cualquier tasa y período.',
    formula:     'F/P • P/F • A/F • A/P • F/A • P/A',
    color:       '#7F1D1D',
  },
  {
    href:        '/guia',
    icon:        <BookOutlined style={{ fontSize: 28 }} />,
    titulo:      'Guía',
    subtitulo:   'Material Teórico S1–S10',
    desc:        'Resumen de los temas del curso: equivalencia financiera, series uniformes, métodos de evaluación y comparación.',
    formula:     'INE135 — 2026',
    color:       '#6B1111',
  },
];

export default function DashboardClient() {
  return (
    <div>
      {/* Hero */}
      <div style={{
        background:    'linear-gradient(135deg, #1C0808 0%, #991B1B 100%)',
        borderRadius:  16,
        padding:       '36px 32px',
        marginBottom:  28,
        color:         '#fff',
        position:      'relative',
        overflow:      'hidden',
      }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Badge.Ribbon text="INE135 — 2026" color="#7F1D1D">
            <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 900, fontSize: 28 }}>
              SEAE — Sistema de Evaluación de<br />Alternativas Económicas
            </Title>
          </Badge.Ribbon>
          <Paragraph style={{ color: '#fca5a5', marginTop: 12, marginBottom: 20, fontSize: 14 }}>
            Herramienta de apoyo para la evaluación financiera de proyectos de inversión.<br />
            Implementa los tres métodos fundamentales de la Ingeniería Económica.
          </Paragraph>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Sin login requerido', icon: <CheckCircleOutlined /> },
              { label: 'Datos guardados localmente', icon: <CheckCircleOutlined /> },
              { label: '6 calculadoras integradas', icon: <CheckCircleOutlined /> },
            ].map(tag => (
              <span key={tag.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'rgba(255,255,255,0.12)', borderRadius: 20,
                padding: '4px 12px', fontSize: 12, color: '#fff',
              }}>
                {tag.icon} {tag.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tarjetas de módulos */}
      <Title level={5} style={{ color: '#374151', marginBottom: 16, fontWeight: 700 }}>
        Módulos del Sistema
      </Title>

      <Row gutter={[16, 16]}>
        {MODULOS.map(mod => (
          <Col key={mod.href} xs={24} sm={12} lg={8}>
            <Card
              hoverable
              style={{ height: '100%', borderRadius: 12, border: '1px solid #f3f4f6' }}
              styles={{ body: { padding: 20, display: 'flex', flexDirection: 'column', height: '100%' } }}
            >
              {/* Ícono */}
              <div style={{
                width: 52, height: 52, borderRadius: 12,
                background: mod.color, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: '#fff', marginBottom: 12,
              }}>
                {mod.icon}
              </div>

              {/* Textos */}
              <Text strong style={{ fontSize: 18, color: mod.color, display: 'block' }}>
                {mod.titulo}
              </Text>
              <Text style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 8 }}>
                {mod.subtitulo}
              </Text>
              <Text style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, display: 'block', flex: 1 }}>
                {mod.desc}
              </Text>

              {/* Fórmula */}
              <div style={{
                background: '#FEF2F2', borderRadius: 8, padding: '8px 12px',
                margin: '12px 0', borderLeft: `3px solid ${mod.color}`,
              }}>
                <code style={{ fontSize: 11.5, color: mod.color, fontWeight: 700 }}>
                  {mod.formula}
                </code>
              </div>

              {/* Botón */}
              <Link href={mod.href} style={{ display: 'block' }}>
                <Button
                  type="primary"
                  size="small"
                  icon={<ArrowRightOutlined />}
                  style={{ background: mod.color, borderColor: mod.color, width: '100%', fontWeight: 600 }}
                >
                  Abrir {mod.titulo}
                </Button>
              </Link>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Info proyecto */}
      <Card style={{ marginTop: 24, borderRadius: 12, background: COLOR_PRIMARY_LIGHT, border: `1px solid #fecaca` }}>
        <Row gutter={24} align="middle">
          <Col flex="auto">
            <Text strong style={{ color: COLOR_PRIMARY, fontSize: 14 }}>
              Proyecto de Ciclo 2026 — INE135 Ingeniería de Negocios
            </Text>
            <br />
            <Text style={{ color: '#7F1D1D', fontSize: 12 }}>
              Entrega: 9 de mayo 2026 &nbsp;|&nbsp; Presentación: 11–15 de mayo 2026 &nbsp;|&nbsp; 15 minutos por grupo
            </Text>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
