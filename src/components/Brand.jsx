import { Link } from 'react-router-dom';

export default function Brand({ onClick }) {
  return (
    <Link className="brand" to="/" onClick={onClick} aria-label="Ajiomart home">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 36 36" fill="none">
          <path d="M8 28 17.9 7h.3L28 28M12.4 19.5h11.2" />
          <path className="brand-mark-accent" d="M26.5 8.2h2.2v2.2h-2.2z" />
        </svg>
      </span>
      <span className="brand-name">Ajiomart<small>STYLE / BEAUTY / JEWELLERY</small></span>
    </Link>
  );
}
