import type { SubredditCandidate } from "@/lib/reddit/rank";

export function SubredditCard(props: {
  sub: SubredditCandidate;
  selected: boolean;
  onSelect: () => void;
}) {
  const { sub, selected, onSelect } = props;
  return (
    <button class={`sub-card${selected ? " selected" : ""}`} onClick={onSelect}>
      <a
        class="sub-name"
        href={`https://www.reddit.com/r/${sub.name}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
      >
        r/{sub.name}
      </a>
      <span class="sub-meta">{sub.subscribers.toLocaleString()} members</span>
    </button>
  );
}
