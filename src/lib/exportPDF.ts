/**
 * SEAE — Exportación de resultados a PDF
 * Usa jsPDF + jspdf-autotable para generación client-side
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fmtMoneda, fmtPct, rd4 } from './formulas';
import type { ResultadoVPN, ResultadoCAE, ResultadoTIR, ResultadoComparacion } from './formulas';

type DocWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } };

const R = 139, G = 13, B = 20; // #8B0D14 — UES wine red

function addHeader(doc: jsPDF, titulo: string): number {
  // Barra roja superior
  doc.setFillColor(R, G, B);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('SEAE — Sistema de Evaluación de Alternativas Económicas', 14, 10);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('INE135 | Ingeniería de Negocios | Universidad Empresarial de El Salvador', 14, 18);
  doc.text(new Date().toLocaleDateString('es-SV'), 196, 18, { align: 'right' });

  // Título de sección
  doc.setFontSize(15);
  doc.setTextColor(R, G, B);
  doc.setFont('helvetica', 'bold');
  doc.text(titulo, 14, 36);

  // Línea divisora
  doc.setDrawColor(R, G, B);
  doc.setLineWidth(0.4);
  doc.line(14, 39, 196, 39);

  doc.setTextColor(55, 65, 81);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  return 46;
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(
      `Generado por SEAE · INE135 · Página ${i} de ${pageCount}`,
      105,
      290,
      { align: 'center' },
    );
  }
}

// ─── VPN ─────────────────────────────────────────────────────────────────────

export interface InputsVPN {
  inversionInicial: number;
  tasaDescuento: number;
  valorResidual: number;
}

export function exportVPNPDF(resultado: ResultadoVPN, inputs: InputsVPN) {
  const doc = new jsPDF() as DocWithAutoTable;
  let y = addHeader(doc, 'Valor Presente Neto (VPN)');

  // Fórmula
  doc.setFontSize(9);
  doc.setTextColor(107, 114, 128);
  doc.text('Fórmula: VPN = −I₀ + Σ [FCₜ / (1 + i)ᵗ]', 14, y);
  y += 8;

  // Parámetros de entrada
  autoTable(doc, {
    startY: y,
    head: [['Parámetro de entrada', 'Valor']],
    body: [
      ['Inversión Inicial (I₀)', fmtMoneda(inputs.inversionInicial)],
      ['Tasa de Descuento TMAR', `${inputs.tasaDescuento}%`],
      ['Valor Residual / Salvamento', fmtMoneda(inputs.valorResidual)],
      ['Número de Períodos', `${resultado.periodos} años`],
    ],
    headStyles: { fillColor: [R, G, B] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
    tableWidth: 'auto',
  });
  y = doc.lastAutoTable.finalY + 10;

  // Resultado destacado
  const decisionColor: [number, number, number] =
    resultado.decision === 'ACEPTAR' ? [21, 128, 61] :
    resultado.decision === 'RECHAZAR' ? [220, 38, 38] : [180, 83, 9];

  const bgVPN: [number, number, number] = resultado.vpn >= 0 ? [220, 252, 231] : [254, 226, 226];
  doc.setFillColor(...bgVPN);
  doc.roundedRect(14, y, 86, 20, 3, 3, 'F');
  doc.setFontSize(8); doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal');
  doc.text('VALOR PRESENTE NETO', 57, y + 7, { align: 'center' });
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.setTextColor(R, G, B);
  doc.text(fmtMoneda(resultado.vpn), 57, y + 15, { align: 'center' });

  const bgDec: [number, number, number] =
    resultado.decision === 'ACEPTAR' ? [220, 252, 231] :
    resultado.decision === 'RECHAZAR' ? [254, 226, 226] : [254, 243, 199];
  doc.setFillColor(...bgDec);
  doc.roundedRect(106, y, 90, 20, 3, 3, 'F');
  doc.setFontSize(8); doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal');
  doc.text('DECISIÓN', 151, y + 7, { align: 'center' });
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.setTextColor(...decisionColor);
  doc.text(resultado.decision, 151, y + 15, { align: 'center' });

  y += 26;

  // Interpretación
  doc.setFontSize(10); doc.setFont('helvetica', 'normal'); doc.setTextColor(55, 65, 81);
  const msg =
    resultado.decision === 'ACEPTAR'
      ? `El proyecto AGREGA valor: VPN = ${fmtMoneda(resultado.vpn)} > $0. Se recomienda invertir.`
      : resultado.decision === 'RECHAZAR'
      ? `El proyecto DESTRUYE valor: VPN = ${fmtMoneda(resultado.vpn)} < $0. No se recomienda invertir.`
      : `El proyecto es INDIFERENTE: VPN ≈ $0. Retorno igual a la tasa de descuento (${resultado.tasaUsada}%).`;
  doc.text(msg, 14, y, { maxWidth: 182 });
  y += 12;

  // Tabla de flujos descontados
  const totalFC = resultado.filas.reduce((s, f) => s + f.flujoCaja, 0);
  const totalDesc = resultado.filas.reduce((s, f) => s + f.flujoCajaDescontado, 0);

  autoTable(doc, {
    startY: y,
    head: [['Período', 'Flujo de Caja', 'Factor P/F (i,t)', 'Flujo Descontado']],
    body: resultado.filas.map(f => [
      `t = ${f.periodo}`,
      fmtMoneda(f.flujoCaja),
      rd4(f.factorPF).toFixed(4),
      fmtMoneda(f.flujoCajaDescontado),
    ]),
    foot: [['TOTAL', fmtMoneda(totalFC), '—', fmtMoneda(totalDesc)]],
    headStyles: { fillColor: [R, G, B] },
    footStyles: { fillColor: [254, 242, 242], textColor: [R, G, B], fontStyle: 'bold' },
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

// ─── CAE ─────────────────────────────────────────────────────────────────────

export interface InputsCAE {
  costoInicial: number;
  tasaDescuento: number;
  vida: number;
  costosAnuales: number;
  valorSalvamento: number;
}

export function exportCAEPDF(resultado: ResultadoCAE, inputs: InputsCAE) {
  const doc = new jsPDF() as DocWithAutoTable;
  let y = addHeader(doc, 'Costo Anual Equivalente (CAE)');

  doc.setFontSize(9); doc.setTextColor(107, 114, 128);
  doc.text('Fórmula: CAE = VPN × FRC = VPN × [i(1+i)ⁿ / ((1+i)ⁿ − 1)]', 14, y);
  y += 8;

  // Parámetros
  autoTable(doc, {
    startY: y,
    head: [['Parámetro de entrada', 'Valor']],
    body: [
      ['Costo / Inversión Inicial', fmtMoneda(inputs.costoInicial)],
      ['Tasa de Descuento TMAR', `${inputs.tasaDescuento}%`],
      ['Vida Útil', `${inputs.vida} años`],
      ['Costos Anuales de Operación', fmtMoneda(inputs.costosAnuales)],
      ['Valor de Salvamento', fmtMoneda(inputs.valorSalvamento)],
    ],
    headStyles: { fillColor: [R, G, B] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 10;

  // KPIs
  doc.setFillColor(220, 252, 231);
  doc.roundedRect(14, y, 86, 20, 3, 3, 'F');
  doc.setFontSize(8); doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal');
  doc.text('COSTO ANUAL EQUIVALENTE', 57, y + 7, { align: 'center' });
  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(R, G, B);
  doc.text(fmtMoneda(resultado.cae), 57, y + 15, { align: 'center' });

  doc.setFillColor(219, 234, 254);
  doc.roundedRect(106, y, 90, 20, 3, 3, 'F');
  doc.setFontSize(8); doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal');
  doc.text('VPN CALCULADO', 151, y + 7, { align: 'center' });
  doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 64, 175);
  doc.text(fmtMoneda(resultado.vpn), 151, y + 15, { align: 'center' });

  y += 28;

  // Desglose del cálculo
  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Valor']],
    body: [
      ['Inversión inicial', fmtMoneda(inputs.costoInicial)],
      ['Costos anuales de operación', fmtMoneda(inputs.costosAnuales)],
      ['Valor de salvamento', fmtMoneda(inputs.valorSalvamento)],
      ['Tasa de descuento (i)', `${inputs.tasaDescuento}%`],
      ['Vida útil (n)', `${inputs.vida} años`],
      ['VPN equivalente', fmtMoneda(resultado.vpn)],
      ['Factor FRC (A/P, i, n)', rd4(resultado.frc).toFixed(4)],
      ['CAE = VPN × FRC', fmtMoneda(resultado.cae)],
    ],
    headStyles: { fillColor: [R, G, B] },
    bodyStyles: {},
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === 7) {
        data.cell.styles.fillColor = [254, 242, 242];
        data.cell.styles.textColor = [R, G, B];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = doc.lastAutoTable.finalY + 8;
  doc.setFontSize(9); doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal');
  doc.text(
    'Criterio: seleccionar la alternativa con mayor CAE si representa beneficios netos, o menor CAE absoluto si son solo costos.',
    14, y, { maxWidth: 182 },
  );

  addFooter(doc);
  doc.save(`SEAE_CAE_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── CAE Comparación (A vs B) ────────────────────────────────────────────────

export function exportCAEComparacionPDF(
  resA: ResultadoCAE, inA: InputsCAE,
  resB: ResultadoCAE, inB: InputsCAE,
  mejorLabel: string,
) {
  const doc = new jsPDF() as DocWithAutoTable;
  let y = addHeader(doc, 'Costo Anual Equivalente (CAE) — Comparación A vs B');

  doc.setFontSize(9); doc.setTextColor(107, 114, 128);
  doc.text('CAE = VPN × FRC  |  FRC = i(1+i)ⁿ / ((1+i)ⁿ - 1)  |  Seleccionar mayor CAE (beneficios) o menor absoluto (costos)', 14, y);
  y += 8;

  // Tabla comparativa
  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Alternativa A', 'Alternativa B']],
    body: [
      ['Inversión inicial',        fmtMoneda(inA.costoInicial),    fmtMoneda(inB.costoInicial)],
      ['Costos anuales',           fmtMoneda(inA.costosAnuales),   fmtMoneda(inB.costosAnuales)],
      ['Valor de salvamento',      fmtMoneda(inA.valorSalvamento), fmtMoneda(inB.valorSalvamento)],
      ['Tasa TMAR',                `${inA.tasaDescuento}%`,        `${inB.tasaDescuento}%`],
      ['Vida útil',                `${inA.vida} años`,             `${inB.vida} años`],
      ['VPN calculado',            fmtMoneda(resA.vpn),            fmtMoneda(resB.vpn)],
      ['FRC (A/P, i, n)',          rd4(resA.frc).toFixed(4),       rd4(resB.frc).toFixed(4)],
      ['CAE = VPN × FRC',         fmtMoneda(resA.cae),            fmtMoneda(resB.cae)],
      ['RECOMENDACIÓN',            mejorLabel === 'Alternativa A' ? '★ ELEGIDA' : '', mejorLabel === 'Alternativa B' ? '★ ELEGIDA' : ''],
    ],
    headStyles: { fillColor: [R, G, B] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: { 0: { cellWidth: 55 }, 1: { halign: 'center' }, 2: { halign: 'center' } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === 8) {
        data.cell.styles.fillColor = [254, 242, 242];
        data.cell.styles.textColor = [R, G, B];
        data.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  doc.setFillColor(254, 242, 242);
  doc.roundedRect(14, y, 182, 14, 3, 3, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(R, G, B);
  doc.text(`Recomendación: ${mejorLabel} — CAE = ${fmtMoneda(mejorLabel === 'Alternativa A' ? resA.cae : resB.cae)}`, 18, y + 9);

  addFooter(doc);
  doc.save(`SEAE_CAE_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── TIR ─────────────────────────────────────────────────────────────────────

export interface InputsTIR {
  inversionInicial: number;
  tasaMinima: number;
  valorResidual: number;
  flujos: number[];
}

export function exportTIRPDF(resultado: ResultadoTIR, inputs: InputsTIR) {
  const doc = new jsPDF() as DocWithAutoTable;
  let y = addHeader(doc, 'Tasa Interna de Retorno (TIR)');

  doc.setFontSize(9); doc.setTextColor(107, 114, 128);
  doc.text('Fórmula: 0 = −I₀ + Σ [FCₜ / (1 + TIR)ᵗ]  →  Despejar TIR (bisección numérica)', 14, y);
  y += 8;

  // Parámetros
  autoTable(doc, {
    startY: y,
    head: [['Parámetro de entrada', 'Valor']],
    body: [
      ['Inversión Inicial (I₀)', fmtMoneda(inputs.inversionInicial)],
      ['TMAR (Tasa Mínima Aceptable)', `${inputs.tasaMinima}%`],
      ['Valor Residual', fmtMoneda(inputs.valorResidual)],
      ['Número de Períodos', `${inputs.flujos.length} años`],
    ],
    headStyles: { fillColor: [R, G, B] },
    columnStyles: { 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });
  y = doc.lastAutoTable.finalY + 10;

  // KPIs
  const decColor: [number, number, number] =
    resultado.decision === 'ACEPTAR' ? [21, 128, 61] :
    resultado.decision === 'RECHAZAR' ? [220, 38, 38] : [180, 83, 9];
  const bgDec: [number, number, number] =
    resultado.decision === 'ACEPTAR' ? [220, 252, 231] :
    resultado.decision === 'RECHAZAR' ? [254, 226, 226] : [254, 243, 199];

  doc.setFillColor(...bgDec);
  doc.roundedRect(14, y, 86, 20, 3, 3, 'F');
  doc.setFontSize(8); doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal');
  doc.text('TASA INTERNA DE RETORNO', 57, y + 7, { align: 'center' });
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(...decColor);
  doc.text(resultado.decision === 'NO_CONVERGE' ? 'N/A' : fmtPct(resultado.tir), 57, y + 15, { align: 'center' });

  doc.setFillColor(219, 234, 254);
  doc.roundedRect(106, y, 90, 20, 3, 3, 'F');
  doc.setFontSize(8); doc.setTextColor(107, 114, 128); doc.setFont('helvetica', 'normal');
  doc.text('TMAR (Referencia)', 151, y + 7, { align: 'center' });
  doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 64, 175);
  doc.text(fmtPct(resultado.tasaMinima), 151, y + 15, { align: 'center' });

  y += 28;

  // Tabla comparativa
  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Valor']],
    body: [
      ['Inversión inicial', fmtMoneda(inputs.inversionInicial)],
      ['Número de períodos', `${inputs.flujos.length} años`],
      ['Valor residual', fmtMoneda(inputs.valorResidual)],
      ['TMAR (tasa de comparación)', fmtPct(resultado.tasaMinima)],
      ['TIR calculada', resultado.decision === 'NO_CONVERGE' ? 'No converge' : fmtPct(resultado.tir)],
      ['Diferencia TIR − TMAR', resultado.decision === 'NO_CONVERGE' ? '—' : fmtPct(resultado.tir - resultado.tasaMinima)],
      ['Decisión', resultado.decision],
    ],
    headStyles: { fillColor: [R, G, B] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === 6 && data.column.index === 1) {
        data.cell.styles.textColor = decColor;
      }
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  // Flujos de caja
  autoTable(doc, {
    startY: y,
    head: [['Período', 'Flujo de Caja']],
    body: inputs.flujos.map((fc, idx) => [`Año ${idx + 1}`, fmtMoneda(fc)]),
    headStyles: { fillColor: [R, G, B] },
    columnStyles: { 0: { halign: 'center' }, 1: { halign: 'right' } },
    margin: { left: 14, right: 14 },
  });

  addFooter(doc);
  doc.save(`SEAE_TIR_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─── Comparación ─────────────────────────────────────────────────────────────

export function exportComparacionPDF(resultado: ResultadoComparacion) {
  const doc = new jsPDF() as DocWithAutoTable;
  let y = addHeader(doc, 'Comparación de Alternativas');

  doc.setFontSize(9); doc.setTextColor(107, 114, 128);
  doc.text(`Criterio: max(VPN) entre alternativas viables. TIR > TMAR. CAE = VPN × FRC. ${resultado.alternativas.length} alternativas evaluadas.`, 14, y);
  y += 8;

  const alts = resultado.alternativas;
  const nombres = alts.map(a => a.input.nombre);

  // Tabla comparativa principal
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
      ['RECOMENDACIÓN',       ...alts.map(a => resultado.mejorVPN === a.input.nombre ? '★ ELEGIDA' : '')],
    ],
    headStyles: { fillColor: [R, G, B] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
    columnStyles: Object.fromEntries([
      [0, { cellWidth: 45 }],
      ...alts.map((_, i) => [i + 1, { halign: 'center' as const }]),
    ]),
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === 9) {
        data.cell.styles.fillColor = [254, 242, 242];
        data.cell.styles.textColor = [R, G, B];
        data.cell.styles.fontStyle = 'bold';
      }
      if ((data.row.index === 5 || data.row.index === 8) && data.column.index > 0) {
        const val = String(data.cell.raw);
        if (val === 'ACEPTAR') data.cell.styles.textColor = [21, 128, 61];
        if (val === 'RECHAZAR') data.cell.styles.textColor = [220, 38, 38];
      }
    },
  });

  y = doc.lastAutoTable.finalY + 8;

  // Recomendación
  doc.setFillColor(254, 242, 242);
  doc.roundedRect(14, y, 182, 16, 3, 3, 'F');
  doc.setFontSize(9); doc.setFont('helvetica', 'bold'); doc.setTextColor(R, G, B);
  doc.text('Recomendación del Sistema:', 18, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(55, 65, 81);
  doc.text(resultado.recomendacion, 18, y + 13, { maxWidth: 174 });

  y += 24;

  // Flujos de caja — todas las alternativas
  const maxPeriodos = Math.max(...alts.map(a => a.input.flujosCaja.length));
  autoTable(doc, {
    startY: y,
    head: [['Período', ...alts.map(a => `${a.input.nombre} — Flujos`)]],
    body: Array.from({ length: maxPeriodos }, (_, i) => [
      `Año ${i + 1}`,
      ...alts.map(a => a.input.flujosCaja[i] !== undefined ? fmtMoneda(a.input.flujosCaja[i]) : '—'),
    ]),
    headStyles: { fillColor: [R, G, B] },
    columnStyles: Object.fromEntries([
      [0, { halign: 'center' as const }],
      ...alts.map((_, i) => [i + 1, { halign: 'right' as const }]),
    ]),
    margin: { left: 14, right: 14 },
  });

  addFooter(doc);
  doc.save(`SEAE_Comparacion_${new Date().toISOString().slice(0, 10)}.pdf`);
}
