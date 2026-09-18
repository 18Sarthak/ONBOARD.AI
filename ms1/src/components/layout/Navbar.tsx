import { Link } from "@tanstack/react-router";

const linkBase =
  "relative flex h-14 items-center px-1 text-sm transition-colors text-[#6b6b8a] hover:text-[#f1f0ff]";

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={linkBase}
      activeProps={{ className: `${linkBase} !text-[#f1f0ff] font-medium` }}
    >
      {({ isActive }) => (
        <>
          {label}
          <span
            className={`absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#7c3aed] transition-opacity ${
              isActive ? "opacity-100" : "opacity-0"
            }`}
          />
        </>
      )}
    </Link>
  );
}

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#1e1e2e] bg-black/40 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link to="/employee" aria-label="OnboardFlow AI home" className="flex items-center gap-2">
          <span className="text-lg text-[#7c3aed]">⬡</span>
          <span className="text-sm font-semibold tracking-tight text-[#7c3aed]">
            OnboardFlow AI
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <NavLink to="/employee" label="Employee Portal" />
          <NavLink to="/manager" label="Manager Dashboard" />
        </nav>
      </div>
    </header>
  );
}
