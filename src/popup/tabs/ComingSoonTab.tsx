export function ComingSoonTab(props: { platform: string }) {
  return (
    <div class="coming-soon">
      <div class="cs-badge">Coming soon</div>
      <p>{props.platform} support is on the way.</p>
      <p class="cs-sub">For now, REACH builds Reddit launch posts.</p>
    </div>
  );
}
