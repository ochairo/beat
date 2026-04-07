export function SampleNav(): JSX.Element {
  return (
    <nav class="sample-nav">
      <a class="sample-nav__link" href="../beat/">
        Beat
      </a>
      <a class="sample-nav__link" href="../react/">
        React
      </a>
      <a aria-current="page" class="sample-nav__link" href="./">
        Solid
      </a>
    </nav>
  );
}
