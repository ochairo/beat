export function SampleNav(): JSX.Element {
  return (
    <nav className="sample-nav">
      <a className="sample-nav__link" href="../beat/">
        Beat
      </a>
      <a className="sample-nav__link" href="../solid/">
        Solid
      </a>
      <a aria-current="page" className="sample-nav__link" href="./">
        React
      </a>
    </nav>
  );
}
