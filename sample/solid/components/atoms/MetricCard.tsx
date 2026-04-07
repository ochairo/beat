interface MetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

export function MetricCard(props: MetricCardProps): JSX.Element {
  return (
    <article class="metric-card">
      <div class="metric-card__label">{props.label}</div>
      <div class="metric-card__value">{props.value}</div>
      <div class="metric-card__detail">{props.detail}</div>
    </article>
  );
}
