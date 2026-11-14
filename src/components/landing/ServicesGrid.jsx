import { Droplet, BookOpen, DollarSign, ClipboardList } from 'lucide-react';
import Reveal from './Reveal';
import diagnosticsImg from '../../assets/diagnostics.png';

const tiles = [
  {
    icon: Droplet,
    label: 'BLOOD BANK',
    upper: true,
    iconClass: 'text-[#D40035] fill-[#D40035]',
    boxClass: '',
  },
  {
    icon: BookOpen,
    label: 'Success Stories',
    upper: false,
    iconClass: 'text-[#00A4EF]',
    boxClass: '',
  },
  {
    icon: DollarSign,
    label: 'Financial Highlights',
    upper: false,
    iconClass: 'text-slate-700',
    boxClass: 'border-2 border-slate-700 rounded-lg',
  },
  {
    icon: ClipboardList,
    label: 'Annual Reports',
    upper: false,
    iconClass: 'text-[#00A4EF]',
    boxClass: '',
  },
];

export default function ServicesGrid() {
  return (
    <section id="services" className="scroll-mt-20 bg-white">
      <div className="grid lg:grid-cols-2">
        {/* Left: diagnostic lab panel */}
        <Reveal
          id="diagnostics"
          variant="reveal-left"
          className="group relative min-h-[360px] scroll-mt-24 overflow-hidden bg-slate-900 lg:min-h-[560px]"
        >
          <img
            src={diagnosticsImg}
            alt="Diagnostics, Clinical Laboratory & Radiology"
            className="h-full w-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
          />
          {/* Subtle gradient overlay to enhance text contrast at the bottom */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/20 to-transparent" />
          <div className="absolute bottom-7 left-7 right-7 z-10">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/40 px-3.5 py-1.5 backdrop-blur-md mb-2.5">
              <span className="h-2 w-2 rounded-full bg-secondary-400 animate-pulse" />
              <span className="font-display text-[11px] font-bold uppercase tracking-[0.2em] text-white">
                Clinical Services
              </span>
            </div>
            <p className="font-display text-sm font-bold uppercase tracking-[0.2em] text-white sm:text-base drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
              Diagnostics • Laboratory • Radiology
            </p>
          </div>
        </Reveal>

        {/* Right: 2×2 quick links */}
        <div className="grid grid-cols-2 border-t border-[#DFE5E8] lg:min-h-[560px] lg:border-l lg:border-t-0">
          {tiles.map((tile, i) => (
            <Reveal
              key={tile.label}
              variant="reveal-pop"
              delay={i * 120}
              className={`group flex cursor-default flex-col items-center justify-center gap-5 px-4 py-12 text-center transition-all duration-300 hover:-translate-y-1 hover:bg-[#F1FAFC] sm:py-16 ${
                i % 2 === 0 ? 'border-r' : ''
              } ${i < 2 ? 'border-b' : ''} border-[#DFE5E8]`}
            >
              <span
                className={`flex h-14 w-14 items-center justify-center transition-transform duration-300 group-hover:scale-110 ${tile.boxClass}`}
              >
                <tile.icon size={30} strokeWidth={2.2} className={tile.iconClass} />
              </span>
              <p
                className={`font-display font-bold text-slate-700 transition-colors group-hover:text-primary-900 ${
                  tile.upper ? 'text-[15px] uppercase tracking-[0.12em]' : 'text-lg'
                }`}
              >
                {tile.label}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
