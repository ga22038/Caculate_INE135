/**
 * SEAE — Fórmulas de Ingeniería Económica
 * INE135 — Ingeniería de Negocios 2026
 *
 * Implementa las 6 familias de factores de equivalencia:
 * F/P, P/F, A/F, A/P, F/A, P/A
 * y los tres métodos de evaluación: VPN, CAE, TIR
 */

// ─── Factores de equivalencia ─────────────────────────────────────────────────

/** F/P: Factor de valor futuro — pago único */
export const factorFP = (i: number, n: number): number =>
  Math.pow(1 + i, n);

/** P/F: Factor de valor presente — pago único */
export const factorPF = (i: number, n: number): number =>
  1 / Math.pow(1 + i, n);

/** A/F: Factor de fondo acumulativo (sinking fund) */
export const factorAF = (i: number, n: number): number =>
  i / (Math.pow(1 + i, n) - 1);

/** A/P: Factor de recuperación de capital */
export const factorAP = (i: number, n: number): number =>
  (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);

/** F/A: Factor de valor futuro — serie uniforme */
export const factorFA = (i: number, n: number): number =>
  (Math.pow(1 + i, n) - 1) / i;

/** P/A: Factor de valor presente — serie uniforme */
export const factorPA = (i: number, n: number): number =>
  (Math.pow(1 + i, n) - 1) / (i * Math.pow(1 + i, n));

// ─── Conversiones básicas ─────────────────────────────────────────────────────

/** Valor Futuro de un pago único */
export const calcVF = (P: number, i: number, n: number): number =>
  P * factorFP(i, n);

/** Valor Presente de un pago único futuro */
export const calcVP = (F: number, i: number, n: number): number =>
  F * factorPF(i, n);

// ─── Tipos de resultado ───────────────────────────────────────────────────────

export interface FilaVPN {
  periodo: number;
  flujoCaja: number;
  flujoCajaDescontado: number;
  factorPF: number;
}

export interface ResultadoVPN {
  vpn: number;
  decision: 'ACEPTAR' | 'RECHAZAR' | 'INDIFERENTE';
  filas: FilaVPN[];
  tasaUsada: number;
  periodos: number;
}

export interface ResultadoCAE {
  cae: number;
  decision: string;
  vpn: number;
  frc: number;
  tasaUsada: number;
  periodos: number;
}

export interface ResultadoTIR {
  tir: number;
  decision: 'ACEPTAR' | 'RECHAZAR' | 'INDIFERENTE' | 'NO_CONVERGE';
  vpnEnTIR: number;
  tasaMinima: number;
}

// ─── Calculadora VPN ──────────────────────────────────────────────────────────

/**
 * Calcula el Valor Presente Neto (VPN / NPV).
 *
 * Fórmula: VPN = -I₀ + Σ [FC_t / (1 + i)^t]
 *
 * @param inversionInicial  Inversión en t=0 (positivo → se convierte a negativo)
 * @param tasaPorcentaje    Tasa de descuento en % (ej: 10 para 10%)
 * @param flujosCaja        Array de flujos anuales t=1..n (pueden ser negativos)
 * @param valorResidual     Valor de salvamento al final del horizonte (default 0)
 */
export function calcularVPN(
  inversionInicial: number,
  tasaPorcentaje: number,
  flujosCaja: number[],
  valorResidual = 0,
): ResultadoVPN {
  const i = tasaPorcentaje / 100;
  const n = flujosCaja.length;

  const filas: FilaVPN[] = flujosCaja.map((fc, idx) => {
    const t = idx + 1;
    const esPeriodoFinal = t === n;
    const flujoTotal = esPeriodoFinal ? fc + valorResidual : fc;
    const factor = factorPF(i, t);
    return {
      periodo: t,
      flujoCaja: flujoTotal,
      flujoCajaDescontado: flujoTotal * factor,
      factorPF: factor,
    };
  });

  const sumadescuentada = filas.reduce((s, f) => s + f.flujoCajaDescontado, 0);
  const vpn = -inversionInicial + sumadescuentada;

  const UMBRAL = 0.01;
  const decision: ResultadoVPN['decision'] =
    vpn > UMBRAL ? 'ACEPTAR' : vpn < -UMBRAL ? 'RECHAZAR' : 'INDIFERENTE';

  return { vpn, decision, filas, tasaUsada: tasaPorcentaje, periodos: n };
}

// ─── Calculadora CAE ──────────────────────────────────────────────────────────

/**
 * Calcula el Costo Anual Equivalente (CAE / EAC).
 *
 * Fórmula: CAE = VPN × FRC = VPN × [i(1+i)^n / ((1+i)^n − 1)]
 *
 * El FRC convierte el VPN a una anualidad equivalente.
 *
 * @param costoInicial         Desembolso inicial (inversión)
 * @param tasaPorcentaje       Tasa de descuento en %
 * @param vida                 Vida útil del proyecto (años)
 * @param costosAnuales        Costos anuales de operación (valor positivo → costo)
 * @param valorSalvamento      Valor residual al fin de la vida útil (default 0)
 */
export function calcularCAE(
  costoInicial: number,
  tasaPorcentaje: number,
  vida: number,
  costosAnuales: number,
  valorSalvamento = 0,
): ResultadoCAE {
  const i = tasaPorcentaje / 100;

  // Flujos: costos anuales son negativos, valor de salvamento positivo al final
  const flujos = Array.from({ length: vida }, (_, idx) => {
    const esFinal = idx + 1 === vida;
    return -costosAnuales + (esFinal ? valorSalvamento : 0);
  });

  const { vpn } = calcularVPN(costoInicial, tasaPorcentaje, flujos);
  const frc = factorAP(i, vida);
  const cae = vpn * frc;

  return {
    cae,
    decision: cae < 0 ? 'Costo neto (egresos > ingresos)' : 'Beneficio neto (ingresos > egresos)',
    vpn,
    frc,
    tasaUsada: tasaPorcentaje,
    periodos: vida,
  };
}

// ─── Calculadora TIR ──────────────────────────────────────────────────────────

/**
 * Calcula la Tasa Interna de Retorno (TIR / IRR) usando el método de bisección.
 *
 * La TIR es la tasa i* tal que VPN(i*) = 0.
 *
 * @param inversionInicial  Inversión en t=0
 * @param flujosCaja        Flujos anuales t=1..n
 * @param tasaMinima        TMAR (Tasa Mínima Aceptable de Rendimiento) en %
 * @param valorResidual     Valor de salvamento (default 0)
 */
export function calcularTIR(
  inversionInicial: number,
  flujosCaja: number[],
  tasaMinima: number,
  valorResidual = 0,
): ResultadoTIR {
  // Función VPN a una tasa dada (como decimal)
  function vpnEn(rate: number): number {
    let suma = -inversionInicial;
    flujosCaja.forEach((fc, idx) => {
      const t = idx + 1;
      const esUltimo = t === flujosCaja.length;
      const flujoTotal = esUltimo ? fc + valorResidual : fc;
      suma += flujoTotal / Math.pow(1 + rate, t);
    });
    return suma;
  }

  // Verificar que hay al menos un flujo positivo
  const hayPositivos = flujosCaja.some(f => f > 0) || valorResidual > 0;
  if (!hayPositivos) {
    return { tir: 0, decision: 'NO_CONVERGE', vpnEnTIR: vpnEn(0), tasaMinima };
  }

  // Bisección: buscar raíz en [-99%, 10000%]
  let lo = -0.9999;
  let hi = 100.0;

  const fLo = vpnEn(lo);
  const fHi = vpnEn(hi);

  if (fLo * fHi > 0) {
    // Buscar un intervalo válido
    let found = false;
    for (let r = 0.001; r <= 50; r += 0.01) {
      if (vpnEn(lo) * vpnEn(r) < 0) {
        hi = r;
        found = true;
        break;
      }
    }
    if (!found) {
      return { tir: 0, decision: 'NO_CONVERGE', vpnEnTIR: vpnEn(0), tasaMinima };
    }
  }

  for (let iter = 0; iter < 500; iter++) {
    const mid = (lo + hi) / 2;
    const fMid = vpnEn(mid);
    if (Math.abs(fMid) < 1e-8 || (hi - lo) < 1e-10) {
      const tirPct = mid * 100;
      const UMBRAL = 0.001;
      const decision: ResultadoTIR['decision'] =
        tirPct - tasaMinima > UMBRAL
          ? 'ACEPTAR'
          : tasaMinima - tirPct > UMBRAL
            ? 'RECHAZAR'
            : 'INDIFERENTE';
      return { tir: tirPct, decision, vpnEnTIR: fMid, tasaMinima };
    }
    if (vpnEn(lo) * fMid < 0) hi = mid;
    else lo = mid;
  }

  const tir = ((lo + hi) / 2) * 100;
  const UMBRAL = 0.001;
  const decision: ResultadoTIR['decision'] =
    tir - tasaMinima > UMBRAL ? 'ACEPTAR' : tasaMinima - tir > UMBRAL ? 'RECHAZAR' : 'INDIFERENTE';
  return { tir, decision, vpnEnTIR: vpnEn((lo + hi) / 2), tasaMinima };
}

// ─── Tabla de factores ────────────────────────────────────────────────────────

export interface FilaFactor {
  n: number;
  FP: number;   // F/P
  PF: number;   // P/F
  AF: number;   // A/F
  AP: number;   // A/P
  FA: number;   // F/A
  PA: number;   // P/A
}

/** Genera la tabla de factores para una tasa y rango de períodos */
export function generarTablaFactores(
  tasaPorcentaje: number,
  nMax: number,
): FilaFactor[] {
  const i = tasaPorcentaje / 100;
  return Array.from({ length: nMax }, (_, idx) => {
    const n = idx + 1;
    return {
      n,
      FP: factorFP(i, n),
      PF: factorPF(i, n),
      AF: factorAF(i, n),
      AP: factorAP(i, n),
      FA: factorFA(i, n),
      PA: factorPA(i, n),
    };
  });
}

// ─── Comparación de alternativas ─────────────────────────────────────────────

export interface AlternativaInput {
  nombre: string;
  inversionInicial: number;
  tasaPorcentaje: number;
  vida: number;
  flujosCaja: number[];
  valorResidual?: number;
}

export interface ResultadoComparacion {
  alternativaA: AlternativaInput;
  alternativaB: AlternativaInput;
  vpnA: ResultadoVPN;
  vpnB: ResultadoVPN;
  tirA: ResultadoTIR;
  tirB: ResultadoTIR;
  recomendacion: string;
  mejorVPN: string;
  mejorTIR: string;
}

export function compararAlternativas(
  a: AlternativaInput,
  b: AlternativaInput,
): ResultadoComparacion {
  const vpnA = calcularVPN(a.inversionInicial, a.tasaPorcentaje, a.flujosCaja, a.valorResidual);
  const vpnB = calcularVPN(b.inversionInicial, b.tasaPorcentaje, b.flujosCaja, b.valorResidual);
  const tirA = calcularTIR(a.inversionInicial, a.flujosCaja, a.tasaPorcentaje, a.valorResidual);
  const tirB = calcularTIR(b.inversionInicial, b.flujosCaja, b.tasaPorcentaje, b.valorResidual);

  const mejorVPN = vpnA.vpn >= vpnB.vpn ? a.nombre : b.nombre;
  const mejorTIR  = tirA.tir >= tirB.tir   ? a.nombre : b.nombre;

  let recomendacion = '';
  if (vpnA.decision === 'RECHAZAR' && vpnB.decision === 'RECHAZAR') {
    recomendacion = 'Ambas alternativas son económicamente no viables. Se recomienda no invertir.';
  } else if (vpnA.decision === 'RECHAZAR') {
    recomendacion = `${b.nombre} es la única alternativa viable (VPN > 0).`;
  } else if (vpnB.decision === 'RECHAZAR') {
    recomendacion = `${a.nombre} es la única alternativa viable (VPN > 0).`;
  } else {
    recomendacion = `Ambas alternativas son viables. Se recomienda ${mejorVPN} por tener mayor VPN ($${vpnA.vpn >= vpnB.vpn ? vpnA.vpn.toFixed(2) : vpnB.vpn.toFixed(2)}).`;
  }

  return { alternativaA: a, alternativaB: b, vpnA, vpnB, tirA, tirB, recomendacion, mejorVPN, mejorTIR };
}

// ─── Utilidades ───────────────────────────────────────────────────────────────

/** Formatea un número como moneda */
export const fmtMoneda = (n: number): string =>
  new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);

/** Formatea un porcentaje */
export const fmtPct = (n: number): string => `${n.toFixed(4)}%`;

/** Redondea a 4 decimales */
export const rd4 = (n: number): number => Math.round(n * 10000) / 10000;
