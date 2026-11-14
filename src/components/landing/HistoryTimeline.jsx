import { Building2 } from 'lucide-react';
import Reveal from './Reveal';
import logoImg from '../../assets/logo.png';
import CloudSky from './CloudSky';

const eras = [
  {
    period: '1964–1999: History',
    dark: true,
    items: [
      '1964 - Foundation stone laid on 144 acres by Malik Amir Mohammad Khan',
      '1965 - First batch of 58 cadets — Jinnah House opens its doors',
      '1971 - 95 of 107 cadets commissioned into the Defence Forces',
      '1978 - Science & Biology laboratories established on campus',
      '1980 - The Academic Block is completed',
    ],
    circle: 'logo',
  },
  {
    period: '2000–2026: History',
    dark: false,
    items: [
      '2005 - Campus dispensary upgraded to round-the-clock OPD',
      '2012 - Inpatient ward & hospital pharmacy operations begin',
      '2019 - Laboratory & radiology diagnostics added to the hospital',
      '2026 - Hospital Management System goes fully digital',
    ],
    circle: 'hospital',
  },
];

function Circle({ kind }) {
  if (kind === 'logo') {
    return (
      <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border-[3px] border-white/40 bg-white shadow-lg sm:h-36 sm:w-36">
        <img src={logoImg} alt="Cadet College Kohat crest" className="h-full w-full scale-110 object-contain p-3" />
      </div>
    );
  }
  return (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-[3px] border-white/40 bg-gradient-to-br from-[#033242] to-[#008A9C] shadow-lg sm:h-36 sm:w-36">
      <Building2 size={52} className="text-white" strokeWidth={1.5} />
    </div>
  );
}

function Card({ era }) {
  const dark = era.dark;
  return (
    <div className="relative">
      <div
        className={`rounded-[30px] px-7 py-8 backdrop-blur-md sm:px-9 ${
          dark
            ? 'border border-white/10 bg-[#0A1626]/85 text-white'
            : 'border border-[#DFE5E8] bg-white text-slate-800 shadow-xl'
        }`}
      >
        <h3 className={`mb-5 font-display text-xl font-bold sm:text-2xl text-left ${dark ? 'text-white' : 'text-[#D40035]'}`}>
          {era.period}
        </h3>
        <ul className="space-y-3 text-left">
          {era.items.map(item => (
            <li
              key={item}
              className={`text-[15px] leading-relaxed text-left ${dark ? 'text-slate-200' : 'text-slate-700'}`}
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
      {/* speech-bubble tail pointing at the circle */}
      {dark ? (
        <span className="absolute -right-3 top-16 hidden h-0 w-0 border-y-[13px] border-y-transparent border-l-[14px] border-l-[#0A1626]/85 lg:block" />
      ) : (
        <span className="absolute -left-3 top-16 hidden h-0 w-0 border-y-[13px] border-y-transparent border-r-[14px] border-r-white lg:block" />
      )}
    </div>
  );
}

export default function HistoryTimeline() {
  return (
    <section
      id="history"
      className="relative scroll-mt-24 overflow-hidden bg-primary-900 py-24 lg:py-32"
    >
      {/* Animated CloudSky backdrop */}
      <div className="absolute inset-0" aria-hidden="true">
        <CloudSky
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', minWidth: 0, minHeight: 0 }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary-950/60 via-transparent to-primary-950/60 pointer-events-none" />
      </div>

      {/* Centre line (draws in on scroll) */}
      <div className="absolute left-1/2 top-24 hidden h-[calc(100%-12rem)] w-0.5 -translate-x-1/2 bg-gradient-to-b from-transparent via-white/30 to-transparent lg:block" aria-hidden="true">
        <Reveal variant="reveal-grow" className="h-full w-full bg-gradient-to-b from-secondary-400/80 via-white/40 to-transparent" />
      </div>

      <div className="relative mx-auto flex max-w-6xl flex-col gap-16 px-5 lg:gap-24 lg:px-10">
        {/* Era 1: dark card (left) + circle (right) */}
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto] lg:gap-16">
          <Reveal variant="reveal-left">
            <Card era={eras[0]} />
          </Reveal>
          <Reveal variant="reveal-pop" delay={200} className="flex justify-center lg:justify-start">
            <Circle kind="logo" />
          </Reveal>
        </div>

        {/* Era 2: circle (left) + white card (right) */}
        <div className="grid items-center gap-8 lg:grid-cols-[auto_1fr] lg:gap-16">
          <Reveal variant="reveal-pop" className="flex justify-center lg:justify-end">
            <Circle kind="hospital" />
          </Reveal>
          <Reveal variant="reveal-right" delay={150}>
            <Card era={eras[1]} />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
