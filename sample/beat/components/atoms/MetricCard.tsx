/** @jsxImportSource @ochairo/beat */
import { component, type BeatJsxChild } from "@ochairo/beat";

interface MetricCardProps {
  readonly label: string;
  readonly value: BeatJsxChild;
  readonly detail: string;
}

export const MetricCard = component<MetricCardProps>((props) => {
  return (
    <article class="metric-card">
      <div class="metric-card__label">{props.label}</div>
      <div class="metric-card__value">{props.value}</div>
      <div class="metric-card__detail">{props.detail}</div>
    </article>
  );
});
