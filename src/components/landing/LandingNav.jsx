import { useEffect, useState } from 'react';
import { Menu, X, LogIn } from 'lucide-react';
import logoImg from '../../assets/logo.png';

const links = [
  { label: 'Hospital Services', href: '#services' },
  { label: 'Diagnostic Services', href: '#diagnostics' },
  { label: 'Clinics', href: '#clinics' },
];

export default function LandingNav({ onOpenLogin }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const isScrolled = window.scrollY > 25;
          setScrolled(prev => (prev !== isScrolled ? isScrolled : prev));
          ticking = false;
        });
        ticking = true;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-[#181a1e]/95 backdrop-blur-md shadow-lg border-b border-white/10 py-2'
          : 'bg-gradient-to-b from-black/45 via-black/15 to-transparent py-4'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 lg:px-10">
        {/* Brand: crest + stacked wordmark */}
        <a href="#home" className="group flex items-center gap-3 focus-visible:outline-none">
          <img
            src={logoImg}
            alt="Cadet College Kohat crest"
            className="h-11 w-11 lg:h-12 lg:w-12 object-contain drop-shadow transition-transform duration-300 group-hover:scale-105"
          />
          <span className="flex flex-col font-display text-[15px] lg:text-[17px] font-extrabold uppercase leading-[0.95] tracking-wide text-white">
            <span>Cadet</span>
            <span>College</span>
            <span>Kohat</span>
          </span>
        </a>

        {/* Desktop links */}
        <div className="hidden items-center gap-9 lg:flex">
          {links.map(link => (
            <a
              key={link.href}
              href={link.href}
              className="group relative font-display text-[13px] font-bold uppercase tracking-[0.09em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] transition-colors hover:text-secondary-300 focus-visible:outline-none"
            >
              {link.label}
              <span className="absolute -bottom-1.5 left-0 h-0.5 w-full origin-left scale-x-0 bg-secondary-400 transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100" />
            </a>
          ))}
        </div>

        {/* Open HMS account */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenLogin}
            className="hidden items-center gap-2 rounded-full bg-secondary-500 px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-primary-950 shadow-md transition-all duration-200 hover:bg-secondary-400 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-transparent lg:inline-flex cursor-pointer"
          >
            <LogIn size={15} strokeWidth={2.5} />
            Open HMS Account
          </button>

          {/* Mobile toggle */}
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/10 text-white backdrop-blur transition hover:bg-white/20 lg:hidden"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`overflow-hidden border-t border-white/10 bg-[#181a1e]/97 backdrop-blur-md transition-all duration-300 lg:hidden ${
          open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="flex flex-col gap-1 px-5 py-5">
          {links.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-4 py-3 font-display text-sm font-bold uppercase tracking-wider text-white transition hover:bg-white/10 hover:text-secondary-300"
            >
              {link.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onOpenLogin?.();
            }}
            className="mt-3 inline-flex items-center justify-center gap-2 rounded-full bg-secondary-500 px-5 py-3 font-display text-sm font-bold uppercase tracking-wider text-primary-950 transition hover:bg-secondary-400 cursor-pointer w-full"
          >
            <LogIn size={16} strokeWidth={2.5} />
            Open HMS Account
          </button>
        </div>
      </div>
    </header>
  );
}
