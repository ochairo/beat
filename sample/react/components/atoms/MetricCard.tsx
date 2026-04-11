import type { JSX } from "react";

interface MetricCardProps {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}

export function MetricCard(props: MetricCardProps): JSX.Element {
  return (
    <article className="metric-card">
      <div className="metric-card__label">{props.label}</div>
      <div className="metric-card__value">{props.value}</div>
      <div className="metric-card__detail">{props.detail}</div>
    </article>
  );
}
