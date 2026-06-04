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
      <span class="sub-right">
        {typeof sub.fitScore === "number" && (
          <span class={`fit-badge${sub.fitScore >= 70 ? " high" : sub.fitScore >= 40 ? " mid" : " low"}`}>
            {sub.fitScore}% fit
          </span>
        )}
        <span class="sub-meta">{sub.subscribers.toLocaleString()} members</span>
      </span>
    </button>
  );
}
