import type { FactItem } from "../../types.js";

interface DemoFactsPanelProps {
  readonly items: readonly FactItem[];
}

export function DemoFactsPanel(props: DemoFactsPanelProps): JSX.Element {
  return (
    <section className="panel">
      <div className="panel__title">
        <h3>Demo facts</h3>
        <span className="panel__subtitle">Concrete numbers behind the screen</span>
      </div>
      <ul className="fact-list">
        {props.items.map((item) => (
          <li key={item.headline}>
            <strong>{item.headline}</strong>
            <span>{item.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}