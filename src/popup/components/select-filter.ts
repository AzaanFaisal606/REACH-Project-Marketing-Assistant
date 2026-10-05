/** One row in a SearchableSelect. */
export interface SelectOption {
  id: string;
  label: string;
  /** Small pill after the label, e.g. "private". */
  badge?: string;
  /** Faint text on the right, e.g. "3d ago". */
  meta?: string;
  /** Searchable tooltip text, e.g. a repo description. */
  hint?: string;
}

/** Case-insensitive match on label, id or hint; keeps the original order. */
export function filterOptions(opts: SelectOption[], query: string): SelectOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return opts;
  return opts.filter((o) =>
    o.label.toLowerCase().includes(q) || o.id.toLowerCase().includes(q) || (o.hint ?? "").toLowerCase().includes(q)
  );
}
