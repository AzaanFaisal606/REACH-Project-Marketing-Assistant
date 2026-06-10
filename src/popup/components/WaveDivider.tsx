// Decorative section divider: two overlapping amber sine waves whose ends fade
// out and dissolve into dashes. Pure SVG so it can do what a flat <hr> cannot.
// Width is fluid (viewBox + preserveAspectRatio="none"); the wrapper's .divider
// class still owns the vertical spacing so both dividers stay consistent.

const W = 300; // viewBox width — arbitrary; SVG scales to the container
const H = 16;
const MID = H / 2;
const AMP = 3.2;        // wave height
const WAVES = 6;        // full sine cycles across the width

// Build a sine path. `phase` shifts the second wave so the two overlap rather
// than sit on top of each other.
function wavePath(phase: number): string {
  const step = W / 60;
  let d = `M 0 ${MID + Math.sin(phase) * AMP}`;
  for (let x = step; x <= W; x += step) {
    const y = MID + Math.sin((x / W) * WAVES * Math.PI * 2 + phase) * AMP;
    d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

export function WaveDivider() {
  return (
    <div class="divider" role="separator" aria-hidden="true">
      <svg
        class="wave-divider"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Fade the stroke out at both ends so the waves dissolve into the
              dashed tails instead of stopping hard. */}
          <linearGradient id="wave-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="var(--divider)" stop-opacity="0" />
            <stop offset="0.18" stop-color="var(--divider)" stop-opacity="1" />
            <stop offset="0.82" stop-color="var(--divider)" stop-opacity="1" />
            <stop offset="1" stop-color="var(--divider)" stop-opacity="0" />
          </linearGradient>
        </defs>

        {/* Two overlapping solid waves, faded at the ends. */}
        <path d={wavePath(0)} fill="none" stroke="url(#wave-fade)" stroke-width="1.4" />
        <path d={wavePath(Math.PI * 0.6)} fill="none" stroke="url(#wave-fade)" stroke-width="1.4" stroke-opacity="0.55" />

        {/* Dashed tails at the very ends — flat baseline dashes that the waves
            fade into. Short, low-opacity, one per side. */}
        <line x1="0" y1={MID} x2={W * 0.14} y2={MID}
          stroke="var(--divider)" stroke-width="1.2" stroke-dasharray="2 3" stroke-opacity="0.7" />
        <line x1={W * 0.86} y1={MID} x2={W} y2={MID}
          stroke="var(--divider)" stroke-width="1.2" stroke-dasharray="2 3" stroke-opacity="0.7" />
      </svg>
    </div>
  );
}
