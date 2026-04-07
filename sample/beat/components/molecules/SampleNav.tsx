/** @jsxImportSource @ochairo/beat */
import { component } from "@ochairo/beat";

export const SampleNav = component(() => {
  return (
    <nav class="sample-nav">
      <a class="sample-nav__link" href="./" aria-current="page">
        Beat
      </a>
      <a class="sample-nav__link" href="../react/">
        React
      </a>
      <a class="sample-nav__link" href="../solid/">
        Solid
      </a>
    </nav>
  );
});
