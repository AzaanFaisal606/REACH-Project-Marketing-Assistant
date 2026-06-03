import type { SubredditCandidate } from "@/lib/reddit/rank";

export function SubredditCard(props: {
  sub: SubredditCandidate;
  selected: boolean;
  onSelect: () => void;
}) {
  const { sub, selected, onSelect } = props;
  return (
    <button class={`sub-card${selected ? " selected" : ""}`} onClick={onSelect}>
      <div class="sub-name">r/{sub.name}</div>
      <div class="sub-meta">{sub.subscribers.toLocaleString()} members</div>
      <div class="sub-desc">{sub.description}</div>
    </button>
  );
}
