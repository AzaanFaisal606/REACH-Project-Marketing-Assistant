import { useState, useEffect, useRef } from "preact/hooks";
import { filterOptions, type SelectOption } from "./select-filter";

// A dropdown with a search box: closed it looks like a select; open it shows a
// focused search field over a filtered list. Keyboard: ↑/↓, Enter, Esc.
export function SearchableSelect(props: {
  label: string;
  /** null while loading. */
  options: SelectOption[] | null;
  value: string;
  placeholder: string;
  onChange: (id: string) => void;
  disabled?: boolean;
}) {
  const { label, options, value, placeholder, onChange, disabled } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Close when clicking anywhere outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const shown = options ? filterOptions(options, query) : [];

  // Keep the keyboard-highlighted row in view.
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const selected = options?.find((o) => o.id === value);
  const triggerText = options === null ? "Loading…" : selected?.label ?? (value || placeholder);

  function toggle() {
    setQuery("");
    setActive(0);
    setOpen((o) => !o);
  }

  function pick(o: SelectOption) {
    onChange(o.id);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setActive((i) => Math.min(i + 1, shown.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (shown[active]) pick(shown[active]); }
    else if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
  }

  return (
    <div class="ss" ref={rootRef}>
      <label>{label}</label>
      <button
        type="button"
        class={`ss-trigger${open ? " open" : ""}${selected || value ? "" : " placeholder"}`}
        disabled={disabled || !options || options.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
      >
        <span class="ss-label">{triggerText}</span>
        {selected?.badge && <span class="ss-badge">{selected.badge}</span>}
        <span class="ss-caret" aria-hidden="true">▾</span>
      </button>

      {open && (
        <div class="ss-popover">
          <input
            ref={searchRef}
            type="search"
            placeholder="Search…"
            value={query}
            onInput={(e) => { setQuery((e.target as HTMLInputElement).value); setActive(0); }}
            onKeyDown={onKeyDown}
          />
          <ul class="ss-list" role="listbox" ref={listRef}>
            {shown.length === 0 && <li class="ss-empty">Nothing matches "{query}".</li>}
            {shown.map((o, i) => (
              <li role="option" aria-selected={o.id === value}>
                <button
                  type="button"
                  class={`ss-row${i === active ? " active" : ""}${o.id === value ? " selected" : ""}`}
                  title={o.hint || o.label}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(o)}
                >
                  <span class="ss-label">{o.label}</span>
                  {o.badge && <span class="ss-badge">{o.badge}</span>}
                  {o.meta && <span class="ss-meta">{o.meta}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
