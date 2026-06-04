import type { SubredditRule } from "./rules";

// Phrases that signal a sub restricts or bans self-promotion. Matched against
// each rule's name + description. We bias toward catching restrictions (a false
// "post at your own risk" warning is cheap; a missed one gets the user banned).
const RESTRICT_PATTERNS = [
  /no\s+self[\s-]?promo/i,
  /no\s+promotion/i,
  /no\s+advertis/i,
  /do\s+not\s+advertis/i,
  /don'?t\s+advertis/i,
  /(?:promotion|advertising|spam)[^.]*\bnot\s+allowed/i,
  /\bno\s+spam/i
];

// If a rule explicitly permits self-promotion, don't treat the sub as
// restrictive on the strength of that one rule.
const ALLOW_PATTERN = /self[\s-]?promotion\s+is\s+allowed/i;

export function restrictsSelfPromotion(rules: SubredditRule[]): boolean {
  return rules.some((r) => {
    const text = `${r.name} ${r.description}`;
    if (ALLOW_PATTERN.test(text)) return false;
    return RESTRICT_PATTERNS.some((p) => p.test(text));
  });
}
