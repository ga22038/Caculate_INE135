'use client';

import { useState } from 'react';
import { Card, Collapse, Typography, Tag, Row, Col, Table, Divider } from 'antd';
import {
  BookOutlined, CalculatorOutlined, LineChartOutlined, RiseOutlined,
  SwapOutlined, TableOutlined, BulbOutlined, CheckCircleOutlined,
} from '@ant-design/icons';
import { COLOR_PRIMARY } from '@/config/antd-theme';

const { Text, Title, Paragraph } = Typography;
const { Panel } = Collapse;

const TEMAS = [
  {
    key: 'S1',
    label: 'S1 — Fundamentos de Ingeniería Económica',
    icon: <BookOutlined />,
    color: '#991B1B',
    contenido: (
      <div>
        <Paragraph>
          La <strong>Ingeniería Económica</strong> es la disciplina que aplica principios económicos y matemáticos
          para la toma de decisiones relacionadas con proyectos de inversión. Permite comparar alternativas
          considerando el valor del dinero en el tiempo.
        </Paragraph>
        <Title level={5} style={{ color: COLOR_PRIMARY }}>Conceptos clave</Title>
        <ul>
          <li><strong>Capital:</strong> Recursos financieros disponibles para invertir.</li>
          <li><strong>Interés:</strong> Costo del dinero en el tiempo. Compensación por el uso de capital ajeno.</li>
          <li><strong>Tasa de interés (i):</strong> Porcentaje que expresa el rendimiento o costo del dinero por período.</li>
          <li><strong>Período (n):</strong> Unidad de tiempo en que se aplica la tasa de interés (mensual, anual, etc.).</li>
          <li><strong>Principio del valor del dinero en el tiempo:</strong> Un peso hoy vale más que un peso en el futuro.</li>
        </ul>
        <Title level={5} style={{ color: COLOR_PRIMARY }}>Tipos de interés</Title>
        <Row gutter={12}>
          <Col span={12}>
            <Card size="small" style={{ background: '#FEF2F2', border: '1px solid #fecaca', borderRadius: 8 }}>
              <Text strong style={{ color: COLOR_PRIMARY }}>Interés Simple</Text>
              <div style={{ fontFamily: 'monospace', marginTop: 4 }}>I = P × i × n</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>El interés se calcula siempre sobre el capital inicial.</div>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" style={{ background: '#FEF2F2', border: '1px solid #fecaca', borderRadius: 8 }}>
              <Text strong style={{ color: COLOR_PRIMARY }}>Interés Compuesto</Text>
              <div style={{ fontFamily: 'monospace', marginTop: 4 }}>F = P(1+i)ⁿ</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>El interés se capitaliza cada período sobre el saldo acumulado.</div>
            </Card>
          </Col>
        </Row>
      </div>
    ),
  },
  {
    key: 'S2',
    label: 'S2 — Equivalencia Financiera y Diagramas de Flujo',
    icon: <TableOutlined />,
    color: '#7F1D1D',
    contenido: (
      <div>
        <Paragraph>
          Dos sumas de dinero son <strong>equivalentes</strong> cuando, a una tasa de interés dada, tienen el mismo valor
          en cualquier punto del tiempo. La equivalencia permite comparar flujos que ocurren en momentos distintos.
        </Paragraph>
        <Title level={5} style={{ color: COLOR_PRIMARY }}>Diagrama de Flujo de Caja</Title>
        <Paragraph>
          Herramienta gráfica que representa los ingresos (flechas hacia arriba) y egresos (flechas hacia abajo)
          a lo largo del tiempo. El eje horizontal es la línea del tiempo.
        </Paragraph>
        <ul>
          <li><strong>P (Presente):</strong> Valor en el período 0 (hoy).</li>
          <li><strong>F (Futuro):</strong> Valor en el período n.</li>
          <li><strong>A (Anualidad):</strong> Pago o ingreso uniforme en cada período.</li>
          <li><strong>G (Gradiente):</strong> Incremento uniforme en cada período.</li>
        </ul>
        <Title level={5} style={{ color: COLOR_PRIMARY }}>Convenciones</Title>
        <ul>
          <li>El período 0 es el presente (inicio).</li>
          <li>Ingresos: flechas positivas (↑). Egresos: flechas negativas (↓).</li>
          <li>Los pagos de tipo A ocurren al <em>final</em> de cada período.</li>
        </ul>
      </div>
    ),
  },
  {
    key: 'S3',
    label: 'S3 — Factores de Equivalencia (P, F, A)',
    icon: <TableOutlined />,
    color: '#991B1B',
    contenido: (
      <div>
        <Paragraph>
          Los <strong>factores de equivalencia</strong> son expresiones matemáticas que convierten un tipo de flujo
          (P, F o A) en otro, a una tasa <em>i</em> durante <em>n</em> períodos.
        </Paragraph>
        <Table
          size="small"
          pagination={false}
          style={{ marginBottom: 16 }}
          columns={[
            { title: 'Notación', dataIndex: 'notacion', width: 90, render: v => <code style={{ color: COLOR_PRIMARY, fontWeight: 700 }}>{v}</code> },
            { title: 'Nombre', dataIndex: 'nombre' },
            { title: 'Fórmula', dataIndex: 'formula', render: v => <code style={{ fontSize: 12 }}>{v}</code> },
            { title: 'Uso', dataIndex: 'uso' },
          ]}
          dataSource={[
            { key: 1, notacion: 'F/P', nombre: 'Valor Futuro de Pago Único',   formula: '(1+i)ⁿ',                      uso: 'Dado P, calcular F' },
            { key: 2, notacion: 'P/F', nombre: 'Valor Presente de Pago Único', formula: '1/(1+i)ⁿ',                    uso: 'Dado F, calcular P' },
            { key: 3, notacion: 'F/A', nombre: 'Valor Futuro de Serie Uniforme',formula: '[(1+i)ⁿ−1]/i',               uso: 'Dada A, calcular F' },
            { key: 4, notacion: 'A/F', nombre: 'Fondo de Amortización',        formula: 'i/[(1+i)ⁿ−1]',               uso: 'Dado F, calcular A' },
            { key: 5, notacion: 'P/A', nombre: 'Valor Presente de Serie Unif.', formula: '[(1+i)ⁿ−1]/[i(1+i)ⁿ]',      uso: 'Dada A, calcular P' },
            { key: 6, notacion: 'A/P', nombre: 'Recuperación de Capital (FRC)', formula: 'i(1+i)ⁿ/[(1+i)ⁿ−1]',        uso: 'Dado P, calcular A' },
          ]}
        />
        <div style={{ background: '#FEF2F2', padding: '10px 14px', borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: '#7F1D1D' }}>
            <strong>Ejemplo:</strong> Si P = $1,000, i = 10%, n = 5 años → F = P(F/P,10%,5) = 1,000 × 1.6105 = <strong>$1,610.51</strong>
          </Text>
        </div>
      </div>
    ),
  },
  {
    key: 'S4',
    label: 'S4 — Valor Presente Neto (VPN)',
    icon: <CalculatorOutlined />,
    color: '#7F1D1D',
    contenido: (
      <div>
        <Paragraph>
          El <strong>Valor Presente Neto (VPN)</strong> traslada todos los flujos de caja futuros al momento presente
          usando la TMAR como tasa de descuento. Mide el valor agregado que genera un proyecto.
        </Paragraph>
        <div style={{ background: '#FEF2F2', padding: '12px 16px', borderRadius: 8, marginBottom: 16, textAlign: 'center' }}>
          <code style={{ fontSize: 15, color: COLOR_PRIMARY }}>VPN = −I₀ + Σ [ FCₜ / (1 + i)ᵗ ]</code>
          <div style={{ fontSize: 11, color: '#7F1D1D', marginTop: 4 }}>
            I₀ = Inversión inicial | FCₜ = Flujo de caja en período t | i = TMAR | t = 1…n
          </div>
        </div>
        <Title level={5} style={{ color: COLOR_PRIMARY }}>Criterio de decisión</Title>
        <Row gutter={12}>
          {[
            { cond: 'VPN > 0', dec: 'ACEPTAR', color: '#dcfce7', tc: '#15803d', desc: 'El proyecto genera riqueza por encima del costo de oportunidad.' },
            { cond: 'VPN = 0', dec: 'INDIFERENTE', color: '#fef3c7', tc: '#92400e', desc: 'El proyecto solo recupera el costo de oportunidad. Decisión neutral.' },
            { cond: 'VPN < 0', dec: 'RECHAZAR', color: '#fee2e2', tc: '#dc2626', desc: 'El proyecto destruye valor; mejor invertir a la tasa TMAR.' },
          ].map(r => (
            <Col span={8} key={r.dec}>
              <div style={{ background: r.color, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <code style={{ fontWeight: 700, color: r.tc }}>{r.cond}</code>
                <div style={{ fontWeight: 700, color: r.tc, fontSize: 13 }}>{r.dec}</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{r.desc}</div>
              </div>
            </Col>
          ))}
        </Row>
        <Title level={5} style={{ color: COLOR_PRIMARY, marginTop: 16 }}>TMAR — Tasa Mínima Aceptable de Rendimiento</Title>
        <Paragraph>
          La <strong>TMAR</strong> (también llamada tasa de oportunidad o costo de capital) es la tasa mínima que
          el inversionista exige a sus proyectos. Normalmente incluye inflación + riesgo del proyecto.
          Si VPN se calcula con la TMAR, significa que el proyecto rinde al menos esa tasa.
        </Paragraph>
      </div>
    ),
  },
  {
    key: 'S5',
    label: 'S5 — Costo Anual Equivalente (CAE)',
    icon: <LineChartOutlined />,
    color: '#991B1B',
    contenido: (
      <div>
        <Paragraph>
          El <strong>Costo Anual Equivalente (CAE)</strong> convierte todos los costos de un proyecto en una
          anualidad uniforme equivalente. Es la herramienta ideal para comparar alternativas con <em>diferentes
          vidas útiles</em> sin necesidad de calcular el MCM de períodos.
        </Paragraph>
        <div style={{ background: '#FEF2F2', padding: '12px 16px', borderRadius: 8, marginBottom: 16, textAlign: 'center' }}>
          <code style={{ fontSize: 14, color: COLOR_PRIMARY }}>CAE = VPN × FRC</code>
          <div style={{ marginTop: 6 }}>
            <code style={{ fontSize: 13, color: '#7F1D1D' }}>FRC = i(1+i)ⁿ / [(1+i)ⁿ − 1]</code>
          </div>
          <div style={{ fontSize: 11, color: '#7F1D1D', marginTop: 4 }}>
            FRC = Factor de Recuperación de Capital (A/P, i, n)
          </div>
        </div>
        <Title level={5} style={{ color: COLOR_PRIMARY }}>¿Cómo se calcula el VPN para CAE?</Title>
        <Paragraph style={{ fontFamily: 'monospace', background: '#f9fafb', padding: 10, borderRadius: 6 }}>
          VPN = −Inversión Inicial − Costos Anuales × (P/A, i, n) + Valor Salvamento × (P/F, i, n)
        </Paragraph>
        <Title level={5} style={{ color: COLOR_PRIMARY }}>Criterio de selección</Title>
        <ul>
          <li>Si los flujos son <strong>solo costos</strong>: elegir la alternativa con <strong>menor CAE absoluto</strong>.</li>
          <li>Si hay <strong>ingresos netos</strong>: elegir la alternativa con <strong>mayor CAE</strong>.</li>
        </ul>
        <div style={{ background: '#FEF2F2', padding: '10px 14px', borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: '#7F1D1D' }}>
            <strong>Ventaja:</strong> Con CAE no es necesario igualar los horizontes de tiempo.
            Se comparan directamente las anualidades anuales de cada alternativa.
          </Text>
        </div>
      </div>
    ),
  },
  {
    key: 'S6',
    label: 'S6 — Tasa Interna de Retorno (TIR)',
    icon: <RiseOutlined />,
    color: '#7F1D1D',
    contenido: (
      <div>
        <Paragraph>
          La <strong>Tasa Interna de Retorno (TIR)</strong> es la tasa de interés <em>i*</em> que hace el VPN exactamente
          igual a cero. Representa la rentabilidad intrínseca del proyecto, independientemente de la TMAR.
        </Paragraph>
        <div style={{ background: '#FEF2F2', padding: '12px 16px', borderRadius: 8, marginBottom: 16, textAlign: 'center' }}>
          <code style={{ fontSize: 14, color: COLOR_PRIMARY }}>0 = −I₀ + Σ [ FCₜ / (1 + TIR)ᵗ ]  →  Despejar TIR</code>
          <div style={{ fontSize: 11, color: '#7F1D1D', marginTop: 4 }}>
            No tiene solución analítica cerrada — se resuelve numéricamente
          </div>
        </div>
        <Title level={5} style={{ color: COLOR_PRIMARY }}>Criterio de decisión</Title>
        <Row gutter={12} style={{ marginBottom: 12 }}>
          {[
            { cond: 'TIR > TMAR', dec: 'ACEPTAR', color: '#dcfce7', tc: '#15803d' },
            { cond: 'TIR = TMAR', dec: 'INDIFERENTE', color: '#fef3c7', tc: '#92400e' },
            { cond: 'TIR < TMAR', dec: 'RECHAZAR', color: '#fee2e2', tc: '#dc2626' },
          ].map(r => (
            <Col span={8} key={r.dec}>
              <div style={{ background: r.color, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                <code style={{ fontWeight: 700, color: r.tc }}>{r.cond}</code>
                <div style={{ fontWeight: 700, color: r.tc }}>{r.dec}</div>
              </div>
            </Col>
          ))}
        </Row>
        <Title level={5} style={{ color: COLOR_PRIMARY }}>Métodos de cálculo numérico</Title>
        <ul>
          <li><strong>Bisección:</strong> Busca la raíz en un intervalo [a, b] donde el VPN cambia de signo. Converge siempre si la TIR existe en el intervalo.</li>
          <li><strong>Newton-Raphson:</strong> Más rápido pero puede divergir. Requiere derivada del VPN.</li>
          <li><strong>Interpolación lineal:</strong> Método clásico manual entre dos tasas con VPN de signo opuesto.</li>
        </ul>
        <div style={{ background: '#FEF2F2', padding: '10px 14px', borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: '#7F1D1D' }}>
            <strong>Advertencia:</strong> Cuando existen múltiples cambios de signo en los flujos, puede haber
            múltiples TIR o ninguna. En esos casos se recomienda usar el VPN como criterio principal.
          </Text>
        </div>
      </div>
    ),
  },
  {
    key: 'S7',
    label: 'S7 — Comparación de Alternativas',
    icon: <SwapOutlined />,
    color: '#991B1B',
    contenido: (
      <div>
        <Paragraph>
          Cuando se evalúan múltiples proyectos mutuamente excluyentes, se debe seleccionar la mejor opción
          usando una metodología consistente. Los métodos más usados son VPN y CAE.
        </Paragraph>
        <Title level={5} style={{ color: COLOR_PRIMARY }}>Metodología de comparación con VPN</Title>
        <ol>
          <li>Calcular el VPN de cada alternativa a la misma TMAR.</li>
          <li>Eliminar las alternativas con VPN &lt; 0 (no viables).</li>
          <li>Seleccionar la alternativa con <strong>mayor VPN positivo</strong>.</li>
          <li>Si todas tienen VPN &lt; 0, rechazar todas (no invertir).</li>
        </ol>
        <Title level={5} style={{ color: COLOR_PRIMARY }}>Metodología de comparación con CAE</Title>
        <ol>
          <li>Calcular el CAE de cada alternativa.</li>
          <li>Permite comparar directamente aunque las vidas útiles sean diferentes.</li>
          <li>Seleccionar la alternativa con <strong>menor CAE</strong> (si son costos) o <strong>mayor CAE</strong> (si son beneficios netos).</li>
        </ol>
        <Title level={5} style={{ color: COLOR_PRIMARY }}>Alternativas con diferente vida útil</Title>
        <Row gutter={12}>
          <Col span={12}>
            <Card size="small" style={{ borderRadius: 8, border: '1px solid #fecaca', background: '#FEF2F2' }}>
              <Text strong style={{ color: COLOR_PRIMARY }}>Método MCM</Text>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Extender el análisis al Mínimo Común Múltiplo de las vidas útiles.
                Supone reposición idéntica al final de cada vida.
              </div>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" style={{ borderRadius: 8, border: '1px solid #fecaca', background: '#FEF2F2' }}>
              <Text strong style={{ color: COLOR_PRIMARY }}>Método CAE</Text>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Más simple. Calcular CAE de cada alternativa y comparar directamente.
                No requiere igualar horizontes de tiempo.
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    ),
  },
  {
    key: 'S8',
    label: 'S8 — Análisis de Sensibilidad',
    icon: <BulbOutlined />,
    color: '#7F1D1D',
    contenido: (
      <div>
        <Paragraph>
          El <strong>Análisis de Sensibilidad</strong> evalúa cómo cambia el VPN (o TIR) ante variaciones en
          los parámetros clave del proyecto. Permite identificar qué variables tienen mayor impacto en
          la rentabilidad.
        </Paragraph>
        <Title level={5} style={{ color: COLOR_PRIMARY }}>Variables típicas de análisis</Title>
        <ul>
          <li>Inversión inicial (±10%, ±20%)</li>
          <li>Tasa de descuento TMAR</li>
          <li>Flujos de caja anuales (variaciones en ingresos o costos)</li>
          <li>Valor residual o de salvamento</li>
          <li>Vida útil del proyecto</li>
        </ul>
        <Title level={5} style={{ color: COLOR_PRIMARY }}>Procedimiento</Title>
        <ol>
          <li>Calcular el VPN base (con valores esperados).</li>
          <li>Variar una sola variable a la vez (±10%, ±20%, ±30%).</li>
          <li>Recalcular el VPN para cada variación.</li>
          <li>Graficar VPN vs. % de variación de la variable.</li>
          <li>La variable con mayor pendiente es la más sensible (más riesgosa).</li>
        </ol>
        <div style={{ background: '#FEF2F2', padding: '10px 14px', borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: '#7F1D1D' }}>
            <strong>Punto de equilibrio:</strong> El valor de la variable en que VPN = 0.
            Si el punto de equilibrio está cerca del valor base, el proyecto es muy sensible a esa variable.
          </Text>
        </div>
      </div>
    ),
  },
  {
    key: 'S9',
    label: 'S9 — Período de Recuperación (PR)',
    icon: <CheckCircleOutlined />,
    color: '#991B1B',
    contenido: (
      <div>
        <Paragraph>
          El <strong>Período de Recuperación (PR)</strong> indica en cuánto tiempo se recupera la inversión inicial
          con los flujos de caja del proyecto. Es un indicador de liquidez y riesgo, no de rentabilidad.
        </Paragraph>
        <Title level={5} style={{ color: COLOR_PRIMARY }}>Período de Recuperación Simple (PRS)</Title>
        <Paragraph style={{ fontFamily: 'monospace', background: '#f9fafb', padding: 10, borderRadius: 6 }}>
          PRS = Año en que la suma acumulada de FCₜ ≥ I₀
        </Paragraph>
        <ul>
          <li>No considera el valor del dinero en el tiempo.</li>
          <li>Fácil de calcular e interpretar.</li>
          <li>Ignora los flujos después del período de recuperación.</li>
        </ul>
        <Title level={5} style={{ color: COLOR_PRIMARY }}>Período de Recuperación Descontado (PRD)</Title>
        <Paragraph style={{ fontFamily: 'monospace', background: '#f9fafb', padding: 10, borderRadius: 6 }}>
          PRD = Año en que la suma acumulada de [FCₜ / (1+i)ᵗ] ≥ I₀
        </Paragraph>
        <ul>
          <li>Sí considera el valor del dinero en el tiempo.</li>
          <li>Siempre mayor o igual al PRS.</li>
          <li>Si el PRD no existe en la vida del proyecto, el VPN es negativo.</li>
        </ul>
        <div style={{ background: '#FEF2F2', padding: '10px 14px', borderRadius: 8 }}>
          <Text style={{ fontSize: 12, color: '#7F1D1D' }}>
            <strong>Limitación:</strong> El PR no es un indicador de rentabilidad. Un proyecto puede tener PR corto
            pero VPN negativo, o viceversa. Siempre complementarlo con VPN o TIR.
          </Text>
        </div>
      </div>
    ),
  },
  {
    key: 'S10',
    label: 'S10 — Resumen y Criterios de Decisión',
    icon: <CheckCircleOutlined />,
    color: '#7F1D1D',
    contenido: (
      <div>
        <Paragraph>
          Resumen de los indicadores de evaluación de proyectos y sus criterios de decisión para el curso INE135.
        </Paragraph>
        <Table
          size="small"
          pagination={false}
          style={{ marginBottom: 16 }}
          columns={[
            { title: 'Indicador', dataIndex: 'ind', render: v => <Text strong style={{ color: COLOR_PRIMARY }}>{v}</Text> },
            { title: 'Fórmula central', dataIndex: 'formula', render: v => <code style={{ fontSize: 11 }}>{v}</code> },
            { title: 'Criterio ACEPTAR', dataIndex: 'criterio' },
            { title: 'Mejor para', dataIndex: 'uso' },
          ]}
          dataSource={[
            { key: 1, ind: 'VPN',  formula: '−I₀ + Σ FCₜ(P/F,i,t)',  criterio: 'VPN > 0',       uso: 'Proyectos con misma vida útil' },
            { key: 2, ind: 'CAE',  formula: 'VPN × (A/P, i, n)',       criterio: 'Menor costo',   uso: 'Vidas útiles distintas' },
            { key: 3, ind: 'TIR',  formula: 'i* tal que VPN = 0',      criterio: 'TIR > TMAR',    uso: 'Evaluar rentabilidad propia' },
            { key: 4, ind: 'PR',   formula: 'ΣFC ≥ I₀',                criterio: 'PR < n máx',    uso: 'Liquidez / riesgo' },
          ]}
        />
        <Title level={5} style={{ color: COLOR_PRIMARY }}>Jerarquía de métodos recomendada</Title>
        <ol>
          <li><strong>VPN:</strong> Método principal. Mide valor absoluto creado.</li>
          <li><strong>TIR:</strong> Complementario. Mide rentabilidad porcentual.</li>
          <li><strong>CAE:</strong> Cuando hay diferencia de vidas útiles.</li>
          <li><strong>PR:</strong> Indicador secundario de liquidez y riesgo.</li>
        </ol>
        <div style={{ background: '#FEF2F2', padding: '10px 14px', borderRadius: 8, marginTop: 12 }}>
          <Text style={{ fontSize: 12, color: '#7F1D1D' }}>
            <strong>Regla de oro:</strong> Cuando VPN y TIR entran en conflicto en la selección entre alternativas,
            siempre prevalece el criterio del <strong>VPN</strong>, ya que mide el valor absoluto creado para el inversionista.
          </Text>
        </div>
      </div>
    ),
  },
];

export default function GuiaClient() {
  const [activeKeys, setActiveKeys] = useState<string[]>(['S1']);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-icon"><BookOutlined /></div>
        <div>
          <div className="page-header-title">Proyecto de ciclo 2026</div>
          <div className="page-header-sub">Guía teórica del curso INE135 — Ingeniería Económica. Sesiones S1 a S10.</div>
        </div>
      </div>

      {/* Tarjetas resumen de indicadores */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { icon: <CalculatorOutlined />, label: 'VPN', desc: 'Valor Presente Neto', formula: '−I₀ + Σ FCₜ/(1+i)ᵗ' },
          { icon: <LineChartOutlined />, label: 'CAE', desc: 'Costo Anual Equivalente', formula: 'VPN × A/P(i,n)' },
          { icon: <RiseOutlined />, label: 'TIR', desc: 'Tasa Interna de Retorno', formula: 'i* : VPN = 0' },
          { icon: <SwapOutlined />, label: 'Comparación', desc: 'max(VPN) o min(CAE)', formula: 'VPN_A vs VPN_B' },
        ].map(c => (
          <Col key={c.label} xs={12} md={6}>
            <Card size="small" style={{ borderRadius: 10, border: '1px solid #fecaca', background: '#FEF2F2', textAlign: 'center' }}>
              <div style={{ fontSize: 22, color: COLOR_PRIMARY, marginBottom: 4 }}>{c.icon}</div>
              <Text strong style={{ color: COLOR_PRIMARY, fontSize: 16 }}>{c.label}</Text>
              <div style={{ fontSize: 11, color: '#7F1D1D' }}>{c.desc}</div>
              <code style={{ fontSize: 10, color: '#991B1B', display: 'block', background: 'transparent', marginTop: 4 }}>{c.formula}</code>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Accordion de sesiones */}
      <Collapse
        activeKey={activeKeys}
        onChange={keys => setActiveKeys(typeof keys === 'string' ? [keys] : keys)}
        style={{ borderRadius: 12 }}
        expandIconPosition="end"
      >
        {TEMAS.map(t => (
          <Panel
            key={t.key}
            header={
              <span style={{ fontWeight: 600, color: activeKeys.includes(t.key) ? COLOR_PRIMARY : '#374151' }}>
                <span style={{ marginRight: 8, color: COLOR_PRIMARY }}>{t.icon}</span>
                {t.label}
              </span>
            }
            style={{ borderRadius: 8, marginBottom: 6 }}
          >
            <div style={{ padding: '4px 0' }}>
              {t.contenido}
            </div>
          </Panel>
        ))}
      </Collapse>

      <Divider />
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <Text style={{ fontSize: 12, color: '#9ca3af' }}>
          SEAE — Sistema de Evaluación de Alternativas Económicas &nbsp;|&nbsp; INE135 Ingeniería Económica &nbsp;|&nbsp; Ciclo 2026
        </Text>
      </div>
    </div>
  );
}
