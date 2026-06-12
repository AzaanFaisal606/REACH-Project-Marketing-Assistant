import { x, setXToneProfile } from "../state";
import type { ToneProfile } from "../state";

const OPTIONS: { id: ToneProfile; label: string }[] = [
  { id: "buildinpublic", label: "Build in public" },
  { id: "datadriven", label: "Data-driven" },
  { id: "technical", label: "Technical" },
  { id: "hottake", label: "Hot take" }
];

export function ToneProfileDropdown() {
  return (
    <label class="tone-dropdown">
      Tone
      <select
        value={x.toneProfile.value}
        onChange={(e) => setXToneProfile((e.target as HTMLSelectElement).value as ToneProfile)}
      >
        {OPTIONS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
      </select>
    </label>
  );
}
