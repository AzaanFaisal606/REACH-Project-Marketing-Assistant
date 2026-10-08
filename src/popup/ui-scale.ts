// Popup UI scale. The layout is designed in CSS px at 360px wide, which reads
// small on dense laptop screens (e.g. a 14" 1920×1200 panel at 100% OS scale).
// We scale with the screen's usable height in CSS px: ~900px or less (small or
// already OS-scaled screens) stays at 1×, taller screens grow up to MAX_SCALE.
// Chrome caps a popup at 800×600, so the cap keeps the 360px layout well inside
// that width.
const BASE_HEIGHT = 900;
export const MIN_SCALE = 1;
export const MAX_SCALE = 1.15;

// Chrome's popup height limit, in screen px.
const POPUP_MAX_HEIGHT = 600;

export function uiScale(screenHeight: number): number {
  if (!Number.isFinite(screenHeight) || screenHeight <= 0) return MIN_SCALE;
  const raw = (screenHeight / BASE_HEIGHT) * MIN_SCALE;
  const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, raw));
  return Math.round(clamped * 20) / 20; // 0.05 steps keep text crisp
}

// Layout height (before zoom) that fills the popup to Chrome's height limit.
export function popupHeight(scale: number): number {
  return Math.floor(POPUP_MAX_HEIGHT / scale);
}
