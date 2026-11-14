import { Target, Eye } from 'lucide-react';
import Reveal from './Reveal';

function Column({ icon: Icon, label, quote, caption, delay }) {
  return (
    <Reveal delay={delay} className="flex flex-col items-start gap-6">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-[14px] border border-white/25 bg-white/10 backdrop-blur-sm">
          <Icon size={24} className="text-white" strokeWidth={1.8} />
        </span>
        <span className="font-display text-xs font-bold uppercase tracking-[0.28em] text-white/70">
          {label}
        </span>
      </div>
      <p className="text-xl font-medium leading-snug text-white sm:text-2xl lg:text-[1.65rem]">
        &ldquo;{quote}&rdquo;
      </p>
      <span className="block h-0.5 w-12 bg-white/40" />
      <p className="max-w-md text-sm leading-relaxed text-white/60">{caption}</p>
    </Reveal>
  );
}

export default function MissionVision() {
  return (
    <section
      id="clinics"
      className="relative scroll-mt-24 overflow-hidden bg-gradient-to-br from-primary-900 via-[#053648] to-[#06485F] py-24 lg:py-32"
    >
      {/* Ambient glows */}
      <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-secondary-500/20 blur-3xl animate-glow" aria-hidden="true" />
      <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-[#0B5E7A]/40 blur-3xl animate-glow" style={{ animationDelay: '-4s' }} aria-hidden="true" />

      {/* Centre divider + diamond */}
      <div className="absolute left-1/2 top-16 hidden h-[calc(100%-8rem)] w-px -translate-x-1/2 bg-white/15 md:block" aria-hidden="true">
        <span className="absolute left-1/2 top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 bg-secondary-400 animate-diamond" />
      </div>

      <div className="relative mx-auto grid max-w-6xl gap-14 px-5 md:grid-cols-2 md:gap-20 lg:gap-28 lg:px-10">
        <Column
          icon={Target}
          label="Our Mission"
          quote="To provide quality healthcare without discrimination to patients from all walks of life"
          caption="Serving every patient with equal dignity — regardless of background, means, or circumstance."
          delay={0}
        />
        <Column
          icon={Eye}
          label="Our Vision"
          quote="Quality health care and research-based education for all leading to integrated socio-economic community development"
          caption="Building a healthier society through clinical excellence, academic leadership, and community impact."
          delay={220}
        />
      </div>
    </section>
  );
}
