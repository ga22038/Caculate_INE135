/**
 * SEAE — Persistencia en LocalStorage
 * Guarda y recupera los datos de cada calculadora entre sesiones.
 */

const PREFIX = 'seae_';

export function guardar<T>(clave: string, datos: T): void {
  try {
    localStorage.setItem(PREFIX + clave, JSON.stringify(datos));
  } catch {
    // silencioso si localStorage no está disponible
  }
}

export function cargar<T>(clave: string, porDefecto: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + clave);
    if (!raw) return porDefecto;
    return JSON.parse(raw) as T;
  } catch {
    return porDefecto;
  }
}

export function limpiar(clave: string): void {
  try {
    localStorage.removeItem(PREFIX + clave);
  } catch {
    // silencioso
  }
}

// ─── Claves predefinidas ─────────────────────────────────────────────────────

export const CLAVES = {
  vpn:      'vpn',
  cae:      'cae',
  tir:      'tir',
  comparar: 'comparar',
} as const;
