/** @jsxImportSource @ochairo/beat */
import { component } from "@ochairo/beat";
import type { FactItem } from "../../types.js";

interface DemoFactsPanelProps {
  readonly items: readonly FactItem[];
}

export const DemoFactsPanel = component<DemoFactsPanelProps>((props) => {
  return (
    <section class="panel">
      <div class="panel__title">
        <h3>Demo facts</h3>
        <span class="panel__subtitle">Concrete numbers behind the screen</span>
      </div>

      <ul class="fact-list">
        {props.items.map((item) => (
          <li>
            <strong>{item.headline}</strong>
            <span>{item.detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
});