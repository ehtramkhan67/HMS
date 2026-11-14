import { ChevronDown, ArrowRight } from 'lucide-react';
import Reveal from './Reveal';

import heroImage from '../../assets/hero.jpg';

export default function Hero({ onOpenLogin }) {
  return (
    <section id="home" className="relative flex min-h-screen flex-col overflow-hidden bg-neutral-950">
      {/* Background campus photo (positioned below content) */}
      <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <img
          src={heroImage}
          alt="Cadet College Kohat Campus"
          className="h-full w-full object-cover object-center animate-ken-burns scale-105"
        />
        {/* Overlay: hex #494949 on top of background image */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: '#494949',
            opacity: 0.55,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center px-5 pb-28 pt-32 lg:px-10 lg:pt-36">
        <div>
          <Reveal delay={0}>
            <div className="flex items-center gap-4">
              <span className="h-px w-10 bg-secondary-300 lg:w-16" />
              <p className="font-display text-[11px] font-semibold uppercase tracking-[0.3em] text-white/95 sm:text-[13px] lg:text-[15px] lg:tracking-[0.35em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
                Cadet College Hospital • Kohat, Pakistan
              </p>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <h1 className="mt-7 font-display font-black uppercase leading-[0.88] tracking-tight text-white text-[clamp(2.9rem,9vw,7.4rem)] drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
              Quality Healthcare
            </h1>
          </Reveal>

          <Reveal delay={300}>
            <p className="font-display font-black uppercase leading-[0.88] tracking-tight text-secondary-300 text-[clamp(2.9rem,9vw,7.4rem)] drop-shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
              For All
            </p>
          </Reveal>

          <Reveal delay={450}>
            <p className="mt-8 max-w-xl text-base leading-relaxed text-white sm:text-lg lg:text-xl drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              Since 1964 — trusted healthcare for cadets, families and staff.
              Compassionate, expert and accessible medical care at the heart of
              campus.
            </p>
          </Reveal>

          <Reveal delay={600}>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onOpenLogin}
                className="group inline-flex items-center gap-2 rounded-full bg-secondary-500 px-7 py-3.5 font-display text-sm font-bold uppercase tracking-wider text-primary-950 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-secondary-400 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-950 cursor-pointer"
              >
                Open HMS Account
                <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </button>
              <a
                href="#services"
                className="inline-flex items-center gap-2 rounded-full border border-white/40 px-7 py-3.5 font-display text-sm font-bold uppercase tracking-wider text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Explore Services
              </a>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Scroll cue */}
      <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1.5 text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.85)]">
        <span className="font-display text-[10px] font-bold uppercase tracking-[0.3em]">Scroll</span>
        <ChevronDown size={22} className="animate-bob" />
      </div>
    </section>
  );
}
