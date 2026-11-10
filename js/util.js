// Small shared helpers. No dependencies.
import { CONFIG } from './config.js';

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
/** Convert Latin digits in a string or number to Persian digits. */
export const toFa = (v) => String(v).replace(/\d/g, (d) => FA_DIGITS[d]);

/** Fill {placeholders} in a string; {brand} always maps to the Farsi brand name. */
export function fmt(str, vars = {}) {
  return str.replace(/\{(\w+)\}/g, (_, k) => (k === 'brand' ? CONFIG.BRAND_NAME_FA : (vars[k] ?? '')));
}

/**
 * Tiny DOM builder: h('div', {class: 'x', onclick: fn}, child, 'text', ...)
 * Text children are always inserted as text nodes (never as HTML), so nothing is injected.
 */
export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}

// ---- Progress, kept in localStorage (which can throw in private mode) ---------
const memory = { done: {} };
export function loadProgress() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p.done === 'object') return p;
    }
  } catch (e) { /* private mode or corrupted: fall back to memory */ }
  return memory;
}
export function markDone(docId) {
  const p = loadProgress();
  p.done[docId] = true;
  memory.done = p.done;
  try { localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(p)); } catch (e) { /* ignore */ }
}

/** Promise that rejects after ms, used to avoid waiting forever on slow networks. */
export const timeout = (ms, label = 'timeout') => new Promise((_, rej) => setTimeout(() => rej(new Error(label)), ms));

/** Rough capability checks used to decide whether to offer the camera mode at all. */
export function cameraSupport() {
  if (!window.isSecureContext) return 'insecure';
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return 'unsupported';
  try {
    const c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) return 'unsupported';
  } catch (e) { return 'unsupported'; }
  return 'ok';
}
export function webglSupport() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch (e) { return false; }
}
