/**
 * SEAE — Exportación de resultados a PDF
 * Diseño corporativo profesional · Paleta navy/gold
 * Incluye explicaciones dinámicas de cada método
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtMoneda, fmtPct, rd4 } from './formulas';
import type { ResultadoVPN, ResultadoCAE, ResultadoTIR, ResultadoComparacion } from './formulas';

type DocWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } };

// ── Paleta corporativa ────────────────────────────────────────────────────────
const NV:  [number,number,number] = [27,  43,  75];  // Navy  #1B2B4B
const GD:  [number,number,number] = [180, 140,  30];  // Gold  #B48C1E
const GRN: [number,number,number] = [21,  101,  52];  // Verde (ACEPTAR)
const RED: [number,number,number] = [153,  27,  27];  // Rojo  (RECHAZAR)
const AMB: [number,number,number] = [146,  84,   8];  // Amber (INDIFERENTE)
const TX:  [number,number,number] = [26,   32,  44];  // Texto principal
const TX2: [number,number,number] = [80,   90, 110];  // Texto secundario
const BG1: [number,number,number] = [240, 244, 249];  // Fila alternada
const BG2: [number,number,number] = [248, 250, 252];  // Fondo info

function decColor(d: string): [number,number,number] {
  return d === 'ACEPTAR' ? GRN : d === 'RECHAZAR' ? RED : AMB;
}
function decBg(d: string): [number,number,number] {
  return d === 'ACEPTAR' ? [214,251,226] : d === 'RECHAZAR' ? [254,220,220] : [254,243,199];
}

// ── Cabecera ──────────────────────────────────────────────────────────────────
function addHeader(doc: jsPDF, titulo: string): number {
  // Barra navy principal
  doc.setFillColor(...NV);
  doc.rect(0, 0, 210, 22, 'F');
  // Línea dorada inferior
  doc.setFillColor(...GD);
  doc.rect(0, 22, 210, 2.5, 'F');

  // Logo / institución
  doc.setFontSize(12.5);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('SEAE — Sistema de Evaluación de Alternativas Económicas', 14, 9.5);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(200, 210, 230);
  doc.text('INE135 · Ingeniería de Negocios · Universidad Empresarial de El Salvador', 14, 17);
  doc.setTextColor(200, 210, 230);
  doc.text(new Date().toLocaleDateString('es-SV'), 196, 17, { align: 'right' });

  // Título del reporte
  doc.setFontSize(14);
  doc.setTextColor(...NV);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, 14, 35);

  // Línea dorada divisora
  doc.setDrawColor(...GD);
  doc.setLineWidth(0.5);
  doc.line(14, 38, 196, 38);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TX);
  doc.setFontSize(10);
  return 45;
}

// ── Pie de página ─────────────────────────────────────────────────────────────
function addFooter(doc: jsPDF) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setDrawColor(...GD);
    doc.setLineWidth(0.3);
    doc.line(14, 284, 196, 284);
    doc.setFontSize(7.5);
    doc.setTextColor(...TX2);
    doc.text('SEAE · INE135 · Ingeniería de Negocios · UES · Confidencial', 14, 289);
    doc.text(`Página ${i} de ${n}`, 196, 289, { align: 'right' });
  }
}

// ── Mini-encabezado de sección ────────────────────────────────────────────────
function sectionBar(doc: jsPDF, text: string, y: number): number {
  doc.setFillColor(...NV);
  doc.roundedRect(14, y, 182, 8, 1.5, 1.5, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text(text.toUpperCase(), 18, y + 5.6);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...TX);
  return y + 12;
}

// ── Caja de explicación dinámica ──────────────────────────────────────────────
// lines: array de strings. Prefix "B:" = negrita navy. Prefix "G:" = verde. Prefix "R:" = rojo. Prefix "S:" = gris pequeño.
function infoBox(doc: jsPDF, lines: string[], y: number, leftMargin = 14, boxWidth = 182): number {
  const lineH = 5.2;
  const padV = 4, padH = 6;
  const boxH = lines.length * lineH + padV * 2;

  doc.setFillColor(...BG2);
  doc.setDrawColor(...NV);
  doc.setLineWidth(0.25);
  doc.roundedRect(leftMargin, y, boxWidth, boxH, 2, 2, 'FD');

  // Acento navy izquierdo
  doc.setFillColor(...NV);
  doc.roundedRect(leftMargin, y, 3, boxH, 1, 1, 'F');

  let ty = y + padV + 3.5;
  for (const raw of lines) {
    if (raw.startsWith('B:')) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...NV);
      doc.text(raw.slice(2), leftMargin + padH + 3, ty);
    } else if (raw.startsWith('G:')) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...GRN);
      doc.text(raw.slice(2), leftMargin + padH + 3, ty);
    } else if (raw.startsWith('R:')) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...RED);
      doc.text(raw.slice(2), leftMargin + padH + 3, ty);
    } else if (raw.startsWith('S:')) {
      doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(...TX2);
      doc.text(raw.slice(2), leftMargin + padH + 3, ty);
    } else {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...TX);
      doc.text(raw, leftMargin + padH + 3, ty);
    }
    ty += lineH;
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...TX);
  return y + boxH + 7;
}

// ── KPI Card (par) ────────────────────────────────────────────────────────────
function kpiPair(
  doc: jsPDF, y: number,
  label1: string, val1: string, col1: [number,number,number],
  label2: string, val2: string, col2: [number,number,number],
): number {
  const cards: Array<[number, string, string, [number,number,number]]> = [
    [14, label1, val1, col1],
    [110, label2, val2, col2],
  ];
  for (const [x, lbl, val, col] of cards) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(...col);
    doc.setLineWidth(0.5);
    doc.roundedRect(x, y, 86, 22, 2, 2, 'FD');
    doc.setFillColor(...col);
    doc.roundedRect(x, y, 86, 5, 1, 1, 'F');
    doc.rect(x, y + 3, 86, 2, 'F');
    doc.setFontSize(7.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(255,255,255);
    doc.text(lbl, x + 43, y + 3.8, { align: 'center' });
    doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(...col);
    doc.text(val, x + 43, y + 17, { align: 'center' });
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...TX);
  return y + 28;
}

// ─────────────────────────────────────────────────────────────────────────────
//  INTERFACES DE ENTRADA
// ─────────────────────────────────────────────────────────────────────────────

export interface InputsVPN {
  inversionInicial: number;
  tasaDescuento: number;
  valorResidual: number;
}

export interface InputsCAE {
  costoInicial: number;
  tasaDescuento: number;
  vida: number;
  costosAnuales: number;
  valorSalvamento: number;
}

export interface InputsTIR {
  inversionInicial: number;
  tasaMinima: number;
  valorResidual: number;
  flujos: number[];
}

// ─────────────────────────────────────────────────────────────────────────────
//  VPN — PROYECTO INDIVIDUAL
// ─────────────────────────────────────────────────────────────────────────────

export function exportVPNPDF(resultado: ResultadoVPN, inputs: InputsVPN) {
  const doc = new jsPDF() as DocWithAutoTable;
  let y = addHeader(doc, 'Valor Presente Neto (VPN)');

  // ── ¿Qué es el VPN? ────────────────────────────────────────────────────────
  y = sectionBar(doc, '¿Qué es el Valor Presente Neto?', y);
  const totalDesc = resultado.filas.reduce((s, f) => s + f.flujoCajaDescontado, 0);
  y = infoBox(doc, [
    'B:Definición',
    'El VPN mide cuánto vale HOY el dinero que generará este proyecto en el futuro.',
    'Un peso hoy vale más que un peso mañana — el VPN "descuenta" los flujos futuros a valor actual.',
    '',
    'B:Fórmula aplicada',
    '  VPN = −I₀  +  Σ [ FCₜ / (1 + i)ᵗ ]',
    '  Donde I₀ = inversión inicial, FCₜ = flujo del período t, i = tasa de descuento, n = períodos.',
    '',
    'B:Sus datos en la fórmula',
    `  −${fmtMoneda(inputs.inversionInicial)}  +  ${fmtMoneda(totalDesc)}  =  ${fmtMoneda(resultado.vpn)}`,
    `  Inversión ${fmtMoneda(inputs.inversionInicial)} descontada al ${inputs.tasaDescuento}% anual durante ${resultado.periodos} año(s).`,
  ], y);

  // ── Parámetros de entrada ──────────────────────────────────────────────────
  y = sectionBar(doc, 'Parámetros de entrada', y);
  autoTable(doc, {
    startY: y,
    head: [['Parámetro', 'Valor ingresado']],
    body: [
      ['Inversión Inicial (I₀)', fmtMoneda(inputs.inversionInicial)],
      ['Tasa de Descuento TMAR', `${inputs.tasaDescuento}%`],
      ['Valor Residual / Salvamento', fmtMoneda(inputs.valorResidual)],
      ['Número de Períodos (n)', `${resultado.periodos} año(s)`],
    ],
    headStyles: { fillColor: NV, textColor: [255,255,255] },
    alternateRowStyles: { fillColor: BG1 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
  });
  y = doc.lastAutoTable.finalY + 10;

  // ── KPI resultado ──────────────────────────────────────────────────────────
  y = kpiPair(
    doc, y,
    'VALOR PRESENTE NETO', fmtMoneda(resultado.vpn),
    resultado.vpn >= 0 ? GRN : RED,
    'DECISIÓN', resultado.decision,
    decColor(resultado.decision),
  );

  // ── Interpretación dinámica ────────────────────────────────────────────────
  const signo = resultado.vpn >= 0 ? 'genera' : 'destruye';
  const absVPN = Math.abs(resultado.vpn);
  const decLines =
    resultado.decision === 'ACEPTAR'
      ? [`G:ACEPTAR — El proyecto es financieramente viable.`,
         `El VPN positivo de ${fmtMoneda(resultado.vpn)} indica que por cada unidad invertida,`,
         `el proyecto retorna más del mínimo exigido (${inputs.tasaDescuento}% anual).`,
         `Recomendación: proceder con la inversión.`]
      : resultado.decision === 'RECHAZAR'
      ? [`R:RECHAZAR — El proyecto no alcanza el rendimiento mínimo requerido.`,
         `El VPN negativo de ${fmtMoneda(resultado.vpn)} indica que el proyecto ${signo}`,
         `${fmtMoneda(absVPN)} de valor. Los flujos descontados no cubren la inversión inicial.`,
         `Recomendación: revisar los flujos de caja o buscar alternativas.`]
      : [`El VPN ≈ $0 indica que el proyecto retorna exactamente la tasa TMAR (${inputs.tasaDescuento}%).`,
         'Decisión indiferente — depende de factores cualitativos.'];

  y = infoBox(doc, [
    'B:¿Cómo interpretar su resultado?',
    ...decLines,
    '',
    'B:Criterios de decisión VPN',
    '  VPN > $0  →  ACEPTAR      (el proyecto agrega valor)',
    '  VPN = $0  →  INDIFERENTE  (retorno exacto a la TMAR)',
    '  VPN < $0  →  RECHAZAR     (el proyecto destruye valor)',
  ], y);

  // ── Tabla de flujos descontados ────────────────────────────────────────────
  y = sectionBar(doc, 'Tabla de flujos descontados', y);
  const totalFC = resultado.filas.reduce((s, f) => s + f.flujoCaja, 0);
  autoTable(doc, {
    startY: y,
    head: [['Período', 'Flujo de Caja', 'Factor  P/F (i, t)', 'Flujo Descontado']],
    body: resultado.filas.map(f => [
      `t = ${f.periodo}`,
      fmtMoneda(f.flujoCaja),
      rd4(f.factorPF).toFixed(4),
      fmtMoneda(f.flujoCajaDescontado),
    ]),
    foot: [['TOTAL', fmtMoneda(totalFC), '—', fmtMoneda(totalDesc)]],
    headStyles: { fillColor: NV, textColor: [255,255,255] },
    footStyles: { fillColor: [230,235,245], textColor: NV, fontStyle: 'bold' },
    alternateRowStyles: { fillColor: BG1 },
    columnStyles: {
      0: { halign: 'center' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
    },
    margin: { left: 14, right: 14 },
  });

  addFooter(doc);
  doc.save(`SEAE_VPN_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  VPN — COMPARACIÓN A vs B
// ─────────────────────────────────────────────────────────────────────────────

export function exportVPNComparacionPDF(
  resA: ResultadoVPN, inA: InputsVPN,
  resB: ResultadoVPN, inB: InputsVPN,
  mejorLabel: string,
) {
  const doc = new jsPDF() as DocWithAutoTable;
  let y = addHeader(doc, 'Valor Presente Neto (VPN) — Comparación A vs B');

  // Explicación del método
  y = sectionBar(doc, '¿Qué es el VPN y cómo se comparan alternativas?', y);
  y = infoBox(doc, [
    'B:Definición',
    'El VPN descuenta todos los flujos futuros al valor de hoy. Permite saber si una inversión',
    'crea o destruye valor económico en términos absolutos (dólares).',
    '',
    'B:Criterio de comparación',
    '  1. Se calcula VPN = −I₀ + Σ[FCₜ/(1+i)ᵗ] para cada alternativa.',
    '  2. Se descartan alternativas con VPN < $0 (destruyen valor).',
    '  3. Entre las viables, se elige la de MAYOR VPN (crea más valor).',
    '',
    'S:Nota: Use CAE cuando las alternativas tienen diferente vida útil.',
  ], y);

  // Tabla comparativa
  y = sectionBar(doc, 'Tabla comparativa de resultados', y);
  const totalDescA = resA.filas.reduce((s, f) => s + f.flujoCajaDescontado, 0);
  const totalDescB = resB.filas.reduce((s, f) => s + f.flujoCajaDescontado, 0);
  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Alternativa A', 'Alternativa B']],
    body: [
      ['Inversión Inicial (I₀)', fmtMoneda(inA.inversionInicial), fmtMoneda(inB.inversionInicial)],
      ['Tasa TMAR', `${inA.tasaDescuento}%`, `${inB.tasaDescuento}%`],
      ['Valor Residual', fmtMoneda(inA.valorResidual), fmtMoneda(inB.valorResidual)],
      ['Períodos evaluados', `${resA.periodos} años`, `${resB.periodos} años`],
      ['Suma flujos descontados', fmtMoneda(totalDescA), fmtMoneda(totalDescB)],
      ['VPN Calculado', fmtMoneda(resA.vpn), fmtMoneda(resB.vpn)],
      ['Decisión individual', resA.decision, resB.decision],
      ['RECOMENDACIÓN', mejorLabel === 'Alternativa A' ? '★ ELEGIDA' : '—', mejorLabel === 'Alternativa B' ? '★ ELEGIDA' : '—'],
    ],
    headStyles: { fillColor: NV, textColor: [255,255,255] },
    alternateRowStyles: { fillColor: BG1 },
    columnStyles: { 0: { cellWidth: 58 }, 1: { halign: 'center' }, 2: { halign: 'center' } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === 7) {
        data.cell.styles.fillColor = [230,235,245];
        data.cell.styles.textColor = NV;
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.row.index === 6 && data.column.index > 0) {
        const v = String(data.cell.raw);
        if (v === 'ACEPTAR') data.cell.styles.textColor = GRN;
        if (v === 'RECHAZAR') data.cell.styles.textColor = RED;
      }
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  // Recomendación
  const mejorVPN = mejorLabel === 'Alternativa A' ? resA.vpn : resB.vpn;
  y = infoBox(doc, [
    `B:Recomendación del sistema: ${mejorLabel}`,
    `VPN = ${fmtMoneda(mejorVPN)} — Esta alternativa crea mayor valor económico neto.`,
    'Se selecciona porque tiene el VPN más alto entre las alternativas con VPN > $0.',
    '',
    'B:¿Por qué importa el VPN?',
    'El VPN en dólares es el criterio más completo: indica la ganancia real de la inversión',
    'una vez descontado el costo del tiempo (tasa TMAR). Un VPN mayor = más riqueza creada.',
  ], y);

  // Flujos por alternativa
  if (y > 210) { doc.addPage(); y = 20; }
  y = sectionBar(doc, 'Flujos descontados — Alternativa A', y);
  autoTable(doc, {
    startY: y,
    head: [['Período', 'Flujo de Caja', 'Factor P/F', 'Flujo Descontado']],
    body: resA.filas.map(f => [`t=${f.periodo}`, fmtMoneda(f.flujoCaja), rd4(f.factorPF).toFixed(4), fmtMoneda(f.flujoCajaDescontado)]),
    headStyles: { fillColor: NV, textColor: [255,255,255] },
    alternateRowStyles: { fillColor: BG1 },
    columnStyles: { 0: { halign:'center' }, 1: { halign:'right' }, 2: { halign:'right' }, 3: { halign:'right' } },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  if (y > 220) { doc.addPage(); y = 20; }
  y = sectionBar(doc, 'Flujos descontados — Alternativa B', y);
  autoTable(doc, {
    startY: y,
    head: [['Período', 'Flujo de Caja', 'Factor P/F', 'Flujo Descontado']],
    body: resB.filas.map(f => [`t=${f.periodo}`, fmtMoneda(f.flujoCaja), rd4(f.factorPF).toFixed(4), fmtMoneda(f.flujoCajaDescontado)]),
    headStyles: { fillColor: [55,65,81] as [number,number,number], textColor: [255,255,255] },
    alternateRowStyles: { fillColor: BG1 },
    columnStyles: { 0: { halign:'center' }, 1: { halign:'right' }, 2: { halign:'right' }, 3: { halign:'right' } },
    margin: { left: 14, right: 14 },
  });

  addFooter(doc);
  doc.save(`SEAE_VPN_Comparacion_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  CAE — PROYECTO INDIVIDUAL
// ─────────────────────────────────────────────────────────────────────────────

export function exportCAEPDF(resultado: ResultadoCAE, inputs: InputsCAE) {
  const doc = new jsPDF() as DocWithAutoTable;
  let y = addHeader(doc, 'Costo Anual Equivalente (CAE)');

  y = sectionBar(doc, '¿Qué es el CAE?', y);
  y = infoBox(doc, [
    'B:Definición',
    'El CAE convierte TODOS los costos/beneficios de un proyecto en una cuota anual uniforme.',
    'Responde: ¿cuánto me cuesta (o genera) este proyecto POR AÑO?',
    '',
    'B:Fórmula aplicada',
    '  CAE = VPN × FRC',
    '  FRC (Factor de Recuperación de Capital) = [ i × (1+i)ⁿ ] / [ (1+i)ⁿ − 1 ]',
    '',
    'B:Sus datos en la fórmula',
    `  FRC = [ ${inputs.tasaDescuento/100} × (${1 + inputs.tasaDescuento/100})^${inputs.vida} ] / [ (${1 + inputs.tasaDescuento/100})^${inputs.vida} − 1 ]  =  ${rd4(resultado.frc).toFixed(4)}`,
    `  CAE = ${fmtMoneda(resultado.vpn)} × ${rd4(resultado.frc).toFixed(4)} = ${fmtMoneda(resultado.cae)} / año`,
  ], y);

  y = sectionBar(doc, 'Parámetros de entrada', y);
  autoTable(doc, {
    startY: y,
    head: [['Parámetro', 'Valor']],
    body: [
      ['Costo / Inversión Inicial', fmtMoneda(inputs.costoInicial)],
      ['Tasa de Descuento TMAR', `${inputs.tasaDescuento}%`],
      ['Vida Útil', `${inputs.vida} años`],
      ['Costos Anuales de Operación', fmtMoneda(inputs.costosAnuales)],
      ['Valor de Salvamento', fmtMoneda(inputs.valorSalvamento)],
    ],
    headStyles: { fillColor: NV, textColor: [255,255,255] },
    alternateRowStyles: { fillColor: BG1 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 10;

  y = kpiPair(
    doc, y,
    'COSTO ANUAL EQUIVALENTE', fmtMoneda(resultado.cae), NV,
    'VPN EQUIVALENTE', fmtMoneda(resultado.vpn), resultado.vpn >= 0 ? GRN : RED,
  );

  y = infoBox(doc, [
    'B:¿Cuándo usar el CAE?',
    'El CAE es INDISPENSABLE para comparar alternativas con DIFERENTE vida útil.',
    `Ejemplo: Alternativa A dura ${inputs.vida} años → CAE = ${fmtMoneda(resultado.cae)}/año.`,
    'Alternativa B podría durar más o menos años pero el CAE las pone en base comparable.',
    '',
    'B:Criterios de decisión',
    '  Si los valores son BENEFICIOS netos:  elegir la alternativa con MAYOR CAE.',
    '  Si los valores son solo COSTOS:        elegir la alternativa con MENOR CAE absoluto.',
    '',
    'B:Factor FRC interpretado',
    `  FRC = ${rd4(resultado.frc).toFixed(4)} → cada $1 de VPN se convierte en $${rd4(resultado.frc).toFixed(4)} anuales`,
    `  durante ${inputs.vida} año(s) al ${inputs.tasaDescuento}% anual.`,
  ], y);

  y = sectionBar(doc, 'Desglose del cálculo CAE', y);
  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Valor']],
    body: [
      ['Inversión inicial', fmtMoneda(inputs.costoInicial)],
      ['Costos anuales de operación', fmtMoneda(inputs.costosAnuales)],
      ['Valor de salvamento', fmtMoneda(inputs.valorSalvamento)],
      ['Tasa de descuento (i)', `${inputs.tasaDescuento}%`],
      ['Vida útil (n)', `${inputs.vida} años`],
      ['VPN calculado', fmtMoneda(resultado.vpn)],
      ['Factor FRC (A/P, i, n)', rd4(resultado.frc).toFixed(4)],
      ['CAE = VPN × FRC', fmtMoneda(resultado.cae)],
    ],
    headStyles: { fillColor: NV, textColor: [255,255,255] },
    alternateRowStyles: { fillColor: BG1 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === 7) {
        data.cell.styles.fillColor = [230,235,245];
        data.cell.styles.textColor = NV;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  addFooter(doc);
  doc.save(`SEAE_CAE_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  CAE — COMPARACIÓN A vs B
// ─────────────────────────────────────────────────────────────────────────────

export function exportCAEComparacionPDF(
  resA: ResultadoCAE, inA: InputsCAE,
  resB: ResultadoCAE, inB: InputsCAE,
  mejorLabel: string,
) {
  const doc = new jsPDF() as DocWithAutoTable;
  let y = addHeader(doc, 'Costo Anual Equivalente (CAE) — Comparación A vs B');

  y = sectionBar(doc, '¿Por qué usar el CAE para comparar?', y);
  y = infoBox(doc, [
    'B:Ventaja del CAE frente al VPN al comparar',
    `Alternativa A tiene vida útil de ${inA.vida} años. Alternativa B tiene ${inB.vida} años.`,
    'Con VPN no se pueden comparar directamente porque tienen horizontes distintos.',
    'El CAE "estandariza" ambas a una base ANUAL común → comparación justa.',
    '',
    'B:Fórmula',
    '  CAE = VPN × FRC   donde   FRC = [i(1+i)ⁿ] / [(1+i)ⁿ − 1]',
    '',
    'B:Criterio de selección',
    '  Mayor CAE → genera más valor por año → alternativa preferida.',
  ], y);

  y = sectionBar(doc, 'Tabla comparativa CAE', y);
  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Alternativa A', 'Alternativa B']],
    body: [
      ['Inversión inicial',      fmtMoneda(inA.costoInicial),    fmtMoneda(inB.costoInicial)],
      ['Costos anuales',         fmtMoneda(inA.costosAnuales),   fmtMoneda(inB.costosAnuales)],
      ['Valor de salvamento',    fmtMoneda(inA.valorSalvamento), fmtMoneda(inB.valorSalvamento)],
      ['Tasa TMAR',              `${inA.tasaDescuento}%`,        `${inB.tasaDescuento}%`],
      ['Vida útil',              `${inA.vida} años`,             `${inB.vida} años`],
      ['VPN calculado',          fmtMoneda(resA.vpn),            fmtMoneda(resB.vpn)],
      ['FRC (A/P, i, n)',        rd4(resA.frc).toFixed(4),       rd4(resB.frc).toFixed(4)],
      ['CAE = VPN × FRC',       fmtMoneda(resA.cae),            fmtMoneda(resB.cae)],
      ['RECOMENDACIÓN', mejorLabel === 'Alternativa A' ? '★ ELEGIDA' : '—', mejorLabel === 'Alternativa B' ? '★ ELEGIDA' : '—'],
    ],
    headStyles: { fillColor: NV, textColor: [255,255,255] },
    alternateRowStyles: { fillColor: BG1 },
    columnStyles: { 0: { cellWidth: 58 }, 1: { halign: 'center' }, 2: { halign: 'center' } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === 8) {
        data.cell.styles.fillColor = [230,235,245];
        data.cell.styles.textColor = NV;
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  const mejorCAE = mejorLabel === 'Alternativa A' ? resA.cae : resB.cae;
  y = infoBox(doc, [
    `B:Recomendación del sistema: ${mejorLabel}`,
    `CAE = ${fmtMoneda(mejorCAE)} / año — Mayor beneficio anual equivalente.`,
    'Aunque las alternativas tienen vidas útiles distintas, el CAE las compara en',
    'términos anuales, eliminando la desventaja de horizontes diferentes.',
  ], y);

  addFooter(doc);
  doc.save(`SEAE_CAE_Comparacion_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  TIR — PROYECTO INDIVIDUAL
// ─────────────────────────────────────────────────────────────────────────────

export function exportTIRPDF(resultado: ResultadoTIR, inputs: InputsTIR) {
  const doc = new jsPDF() as DocWithAutoTable;
  let y = addHeader(doc, 'Tasa Interna de Retorno (TIR)');

  y = sectionBar(doc, '¿Qué es la TIR?', y);
  const tirStr = resultado.decision === 'NO_CONVERGE' ? 'No converge' : fmtPct(resultado.tir);
  const diferencia = resultado.decision !== 'NO_CONVERGE' ? resultado.tir - resultado.tasaMinima : 0;
  y = infoBox(doc, [
    'B:Definición',
    'La TIR es la tasa de rendimiento REAL que genera el proyecto. Es la tasa que hace VPN = 0.',
    'Expresa el retorno del proyecto como porcentaje anual — fácil de comunicar a no técnicos.',
    '',
    'B:Fórmula',
    '  Encontrar TIR tal que:   0 = −I₀ + Σ [ FCₜ / (1 + TIR)ᵗ ]',
    '  No tiene solución algebraica → se calcula por bisección numérica (500 iteraciones).',
    '',
    'B:Sus datos calculados',
    `  TIR calculada = ${tirStr}`,
    `  TMAR (mínimo requerido) = ${fmtPct(inputs.tasaMinima)}`,
    resultado.decision !== 'NO_CONVERGE'
      ? `  Diferencia TIR − TMAR = ${diferencia >= 0 ? '+' : ''}${fmtPct(diferencia)}`
      : '  El algoritmo no encontró convergencia con estos flujos.',
  ], y);

  y = sectionBar(doc, 'Parámetros de entrada', y);
  autoTable(doc, {
    startY: y,
    head: [['Parámetro', 'Valor']],
    body: [
      ['Inversión Inicial (I₀)', fmtMoneda(inputs.inversionInicial)],
      ['TMAR (tasa mínima aceptable)', `${inputs.tasaMinima}%`],
      ['Valor Residual', fmtMoneda(inputs.valorResidual)],
      ['Número de Períodos', `${inputs.flujos.length} año(s)`],
    ],
    headStyles: { fillColor: NV, textColor: [255,255,255] },
    alternateRowStyles: { fillColor: BG1 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 10;

  y = kpiPair(
    doc, y,
    'TASA INTERNA DE RETORNO',
    resultado.decision === 'NO_CONVERGE' ? 'N/A' : fmtPct(resultado.tir),
    decColor(resultado.decision),
    'TMAR (REFERENCIA)',
    fmtPct(resultado.tasaMinima),
    NV,
  );

  // Interpretación
  const intLines =
    resultado.decision === 'ACEPTAR'
      ? [`G:ACEPTAR — La TIR supera la TMAR.`,
         `TIR = ${tirStr} > TMAR = ${fmtPct(inputs.tasaMinima)}.`,
         `El proyecto rinde ${tirStr} anual, superando el mínimo exigido de ${fmtPct(inputs.tasaMinima)}.`,
         `Esto significa que cada peso invertido genera un rendimiento del ${tirStr}.`]
      : resultado.decision === 'RECHAZAR'
      ? [`R:RECHAZAR — La TIR no alcanza la TMAR.`,
         `TIR = ${tirStr} < TMAR = ${fmtPct(inputs.tasaMinima)}.`,
         `El proyecto rinde ${tirStr} anual, por debajo del mínimo exigido de ${fmtPct(inputs.tasaMinima)}.`,
         `Invertir aquí genera menos rendimiento que otras opciones al ${fmtPct(inputs.tasaMinima)}.`]
      : ['No se pudo calcular la TIR para estos flujos. Verifique que los flujos de caja',
         'cambien de signo al menos una vez (inversión negativa seguida de ingresos positivos).'];

  y = infoBox(doc, [
    'B:¿Cómo interpretar su TIR?',
    ...intLines,
    '',
    'B:Criterios de decisión TIR',
    '  TIR > TMAR  →  ACEPTAR      (rinde más del mínimo requerido)',
    '  TIR = TMAR  →  INDIFERENTE  (rendimiento exacto al mínimo)',
    '  TIR < TMAR  →  RECHAZAR     (no alcanza el rendimiento mínimo)',
  ], y);

  y = sectionBar(doc, 'Resumen de cálculo TIR', y);
  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Valor']],
    body: [
      ['Inversión inicial', fmtMoneda(inputs.inversionInicial)],
      ['Número de períodos', `${inputs.flujos.length} años`],
      ['Valor residual', fmtMoneda(inputs.valorResidual)],
      ['TMAR (tasa de comparación)', fmtPct(resultado.tasaMinima)],
      ['TIR calculada', tirStr],
      ['Diferencia TIR − TMAR', resultado.decision === 'NO_CONVERGE' ? '—' : `${diferencia >= 0 ? '+' : ''}${fmtPct(diferencia)}`],
      ['Decisión', resultado.decision],
    ],
    headStyles: { fillColor: NV, textColor: [255,255,255] },
    alternateRowStyles: { fillColor: BG1 },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === 6 && data.column.index === 1) {
        data.cell.styles.textColor = decColor(resultado.decision);
      }
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  y = sectionBar(doc, 'Flujos de caja ingresados', y);
  autoTable(doc, {
    startY: y,
    head: [['Período', 'Flujo de Caja']],
    body: inputs.flujos.map((fc, i) => [`Año ${i + 1}`, fmtMoneda(fc)]),
    headStyles: { fillColor: NV, textColor: [255,255,255] },
    alternateRowStyles: { fillColor: BG1 },
    columnStyles: { 0: { halign: 'center' }, 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  addFooter(doc);
  doc.save(`SEAE_TIR_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  TIR — COMPARACIÓN A vs B
// ─────────────────────────────────────────────────────────────────────────────

export function exportTIRComparacionPDF(
  resA: ResultadoTIR, inA: InputsTIR,
  resB: ResultadoTIR, inB: InputsTIR,
  mejorLabel: string,
) {
  const doc = new jsPDF() as DocWithAutoTable;
  let y = addHeader(doc, 'Tasa Interna de Retorno (TIR) — Comparación A vs B');

  const fmtT = (r: ResultadoTIR) => r.decision === 'NO_CONVERGE' ? 'N/A' : fmtPct(r.tir);
  const diffA = resA.decision !== 'NO_CONVERGE' ? resA.tir - resA.tasaMinima : 0;
  const diffB = resB.decision !== 'NO_CONVERGE' ? resB.tir - resB.tasaMinima : 0;

  y = sectionBar(doc, '¿Cómo comparar alternativas con la TIR?', y);
  y = infoBox(doc, [
    'B:Criterio TIR para comparación',
    '  1. Calcular TIR de cada alternativa (tasa que hace VPN = 0).',
    '  2. Descartar alternativas cuya TIR < TMAR (no alcanzan el mínimo).',
    '  3. Entre las viables, seleccionar la de MAYOR TIR.',
    '',
    'B:Complemento con VPN',
    'La TIR expresa el rendimiento en %. El VPN expresa el valor en $.',
    'Siempre use ambos: TIR para comunicar rendimiento, VPN para decidir.',
    '',
    'S:Fórmula: encontrar TIR tal que 0 = −I₀ + Σ[FCₜ/(1+TIR)ᵗ] (bisección numérica)',
  ], y);

  y = sectionBar(doc, 'Tabla comparativa TIR', y);
  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Alternativa A', 'Alternativa B']],
    body: [
      ['Inversión Inicial',     fmtMoneda(inA.inversionInicial), fmtMoneda(inB.inversionInicial)],
      ['TMAR (referencia)',     `${inA.tasaMinima}%`,            `${inB.tasaMinima}%`],
      ['Valor Residual',       fmtMoneda(inA.valorResidual),     fmtMoneda(inB.valorResidual)],
      ['Períodos',             `${inA.flujos.length} años`,      `${inB.flujos.length} años`],
      ['TIR Calculada',        fmtT(resA),                       fmtT(resB)],
      ['TIR − TMAR',
        resA.decision==='NO_CONVERGE'?'—': `${diffA>=0?'+':''}${fmtPct(diffA)}`,
        resB.decision==='NO_CONVERGE'?'—': `${diffB>=0?'+':''}${fmtPct(diffB)}`,
      ],
      ['Decisión',             resA.decision,                    resB.decision],
      ['RECOMENDACIÓN', mejorLabel==='Alternativa A'?'★ ELEGIDA':'—', mejorLabel==='Alternativa B'?'★ ELEGIDA':'—'],
    ],
    headStyles: { fillColor: NV, textColor: [255,255,255] },
    alternateRowStyles: { fillColor: BG1 },
    columnStyles: { 0: { cellWidth: 58 }, 1: { halign:'center' }, 2: { halign:'center' } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === 7) {
        data.cell.styles.fillColor = [230,235,245];
        data.cell.styles.textColor = NV;
        data.cell.styles.fontStyle = 'bold';
      }
      if (data.row.index === 6 && data.column.index > 0) {
        const v = String(data.cell.raw);
        if (v === 'ACEPTAR') data.cell.styles.textColor = GRN;
        if (v === 'RECHAZAR') data.cell.styles.textColor = RED;
      }
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  const mejorTIR = mejorLabel === 'Alternativa A' ? resA : resB;
  const mejorTIRStr = mejorTIR.decision === 'NO_CONVERGE' ? 'N/A' : fmtPct(mejorTIR.tir);
  y = infoBox(doc, [
    `B:Recomendación del sistema: ${mejorLabel}`,
    `TIR = ${mejorTIRStr} — Mayor rendimiento porcentual anual entre las alternativas viables.`,
    `Esta alternativa supera la TMAR requerida y genera el mayor retorno sobre la inversión.`,
  ], y);

  if (y > 210) { doc.addPage(); y = 20; }
  y = sectionBar(doc, 'Flujos de caja — Alternativa A', y);
  autoTable(doc, {
    startY: y,
    head: [['Período', 'Flujo de Caja']],
    body: inA.flujos.map((fc, i) => [`Año ${i+1}`, fmtMoneda(fc)]),
    headStyles: { fillColor: NV, textColor: [255,255,255] },
    alternateRowStyles: { fillColor: BG1 },
    columnStyles: { 0: { halign:'center' }, 1: { halign:'right' } },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 8;

  if (y > 220) { doc.addPage(); y = 20; }
  y = sectionBar(doc, 'Flujos de caja — Alternativa B', y);
  autoTable(doc, {
    startY: y,
    head: [['Período', 'Flujo de Caja']],
    body: inB.flujos.map((fc, i) => [`Año ${i+1}`, fmtMoneda(fc)]),
    headStyles: { fillColor: [55,65,81] as [number,number,number], textColor: [255,255,255] },
    alternateRowStyles: { fillColor: BG1 },
    columnStyles: { 0: { halign:'center' }, 1: { halign:'right' } },
    margin: { left: 14, right: 14 },
  });

  addFooter(doc);
  doc.save(`SEAE_TIR_Comparacion_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
//  COMPARACIÓN DE ALTERNATIVAS (A, B, C)
// ─────────────────────────────────────────────────────────────────────────────

export function exportComparacionPDF(resultado: ResultadoComparacion) {
  const doc = new jsPDF() as DocWithAutoTable;
  let y = addHeader(doc, 'Comparación de Alternativas');

  const alts = resultado.alternativas;

  y = sectionBar(doc, '¿Cómo funciona la comparación de alternativas?', y);
  y = infoBox(doc, [
    'B:Proceso de evaluación y selección',
    '  1. Se calcula VPN, TIR y CAE para cada alternativa evaluada.',
    '  2. Se descartan alternativas con VPN < $0 (destruyen valor).',
    '  3. Entre las viables, se elige la de MAYOR VPN (criterio principal).',
    '  4. TIR y CAE confirman la decisión desde ángulos complementarios.',
    '',
    'B:¿Por qué tres métodos?',
    '  VPN ($) → mide valor creado en términos absolutos. Criterio principal.',
    '  TIR (%) → mide rendimiento porcentual. Fácil de comunicar.',
    '  CAE ($/año) → útil cuando las alternativas tienen diferente vida útil.',
    '',
    `S:${alts.length} alternativa(s) evaluada(s) en este reporte.`,
  ], y);

  y = sectionBar(doc, 'Tabla comparativa de resultados', y);
  const nombres = alts.map(a => a.input.nombre);
  autoTable(doc, {
    startY: y,
    head: [['Concepto', ...nombres]],
    body: [
      ['Inversión Inicial',   ...alts.map(a => fmtMoneda(a.input.inversionInicial))],
      ['Tasa TMAR',           ...alts.map(a => `${a.input.tasaPorcentaje}%`)],
      ['Vida Útil',           ...alts.map(a => `${a.input.flujosCaja.length} años`)],
      ['Valor Residual',      ...alts.map(a => fmtMoneda(a.input.valorResidual ?? 0))],
      ['VPN Calculado',       ...alts.map(a => fmtMoneda(a.vpn.vpn))],
      ['Decisión VPN',        ...alts.map(a => a.vpn.decision)],
      ['CAE Calculado',       ...alts.map(a => fmtMoneda(a.cae))],
      ['TIR Calculada',       ...alts.map(a => a.tir.decision === 'NO_CONVERGE' ? 'N/A' : fmtPct(a.tir.tir))],
      ['Decisión TIR',        ...alts.map(a => a.tir.decision)],
      ['RECOMENDACIÓN',       ...alts.map(a => resultado.mejorVPN === a.input.nombre ? '★ ELEGIDA' : '—')],
    ],
    headStyles: { fillColor: NV, textColor: [255,255,255] },
    alternateRowStyles: { fillColor: BG1 },
    columnStyles: Object.fromEntries([
      [0, { cellWidth: 42 }],
      ...alts.map((_, i) => [i + 1, { halign: 'center' as const }]),
    ]),
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === 9) {
        data.cell.styles.fillColor = [230,235,245];
        data.cell.styles.textColor = NV;
        data.cell.styles.fontStyle = 'bold';
      }
      if ((data.row.index === 5 || data.row.index === 8) && data.column.index > 0) {
        const val = String(data.cell.raw);
        if (val === 'ACEPTAR') data.cell.styles.textColor = GRN;
        if (val === 'RECHAZAR') data.cell.styles.textColor = RED;
      }
    },
  });
  y = doc.lastAutoTable.finalY + 8;

  // Recomendación final
  const elegida = alts.find(a => a.input.nombre === resultado.mejorVPN);
  y = infoBox(doc, [
    `B:Recomendación del sistema`,
    resultado.recomendacion,
    '',
    elegida
      ? `La alternativa ${elegida.input.nombre} tiene VPN = ${fmtMoneda(elegida.vpn.vpn)}, ` +
        `TIR = ${elegida.tir.decision === 'NO_CONVERGE' ? 'N/A' : fmtPct(elegida.tir.tir)}, ` +
        `CAE = ${fmtMoneda(elegida.cae)}/año.`
      : 'Ninguna alternativa viable detectada. Todos los VPN son negativos.',
    '',
    'B:Recuerde',
    'El VPN es el criterio principal. TIR y CAE son complementarios para confirmar la decisión.',
  ], y);

  // Flujos por alternativa
  if (y > 210) { doc.addPage(); y = 20; }
  const maxP = Math.max(...alts.map(a => a.input.flujosCaja.length));
  y = sectionBar(doc, 'Flujos de caja por alternativa', y);
  autoTable(doc, {
    startY: y,
    head: [['Período', ...alts.map(a => `${a.input.nombre} · Flujos`)]],
    body: Array.from({ length: maxP }, (_, i) => [
      `Año ${i + 1}`,
      ...alts.map(a => a.input.flujosCaja[i] !== undefined ? fmtMoneda(a.input.flujosCaja[i]) : '—'),
    ]),
    headStyles: { fillColor: NV, textColor: [255,255,255] },
    alternateRowStyles: { fillColor: BG1 },
    columnStyles: Object.fromEntries([
      [0, { halign: 'center' as const }],
      ...alts.map((_, i) => [i + 1, { halign: 'right' as const }]),
    ]),
    margin: { left: 14, right: 14 },
  });

  addFooter(doc);
  doc.save(`SEAE_Comparacion_${new Date().toISOString().slice(0, 10)}.pdf`);
}
