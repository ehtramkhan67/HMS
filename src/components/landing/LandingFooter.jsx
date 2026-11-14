import { MapPin, Phone, Mail, LogIn, Clock } from 'lucide-react';
import Reveal from './Reveal';
import logoImg from '../../assets/logo.png';

const quickLinks = [
  { label: 'Hospital Services', href: '#services' },
  { label: 'Diagnostic Services', href: '#diagnostics' },
  { label: 'Clinics', href: '#clinics' },
  { label: 'Our History', href: '#history' },
];

export default function LandingFooter({ onOpenLogin }) {
  return (
    <footer className="bg-[#021C27] text-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-3 lg:px-10">
        {/* Brand */}
        <Reveal className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="Cadet College Kohat crest" className="h-14 w-14 object-contain" />
            <span className="flex flex-col font-display text-lg font-extrabold uppercase leading-[0.95] tracking-wide text-white">
              <span>Cadet</span>
              <span>College</span>
              <span>Kohat</span>
            </span>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-slate-400">
            Compassionate, expert and accessible healthcare at the heart of campus
            — serving cadets, families and staff since 1964.
          </p>
          <button
            type="button"
            onClick={onOpenLogin}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-secondary-500 px-5 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-primary-950 transition hover:bg-secondary-400 cursor-pointer"
          >
            <LogIn size={14} strokeWidth={2.5} />
            Open HMS Account
          </button>
        </Reveal>

        {/* Quick links */}
        <Reveal delay={150} className="flex flex-col gap-5">
          <h4 className="font-display text-xs font-bold uppercase tracking-[0.25em] text-secondary-400">
            Explore
          </h4>
          <ul className="flex flex-col gap-3">
            {quickLinks.map(link => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="font-display text-[13px] font-bold uppercase tracking-wider text-slate-300 transition-colors hover:text-secondary-300"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </Reveal>

        {/* Contact */}
        <Reveal delay={300} className="flex flex-col gap-5">
          <h4 className="font-display text-xs font-bold uppercase tracking-[0.25em] text-secondary-400">
            Contact
          </h4>
          <ul className="flex flex-col gap-4 text-sm text-slate-400">
            <li className="flex items-start gap-3">
              <MapPin size={17} className="mt-0.5 shrink-0 text-secondary-500" />
              Cadet College Kohat, Kohat, Khyber Pakhtunkhwa, Pakistan
            </li>
            <li className="flex items-center gap-3">
              <Phone size={17} className="shrink-0 text-secondary-500" />
              Emergency: 15
            </li>
            <li className="flex items-center gap-3">
              <Mail size={17} className="shrink-0 text-secondary-500" />
              info@cch.edu.pk
            </li>
            <li className="flex items-center gap-3">
              <Clock size={17} className="shrink-0 text-secondary-500" />
              Campus Clinic: Mon–Sat, 8 AM – 8 PM
            </li>
          </ul>
        </Reveal>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-slate-500 sm:flex-row lg:px-10">
          <p>© 2026 Cadet College Kohat Hospital — Hospital Management System. All rights reserved.</p>
          <p className="font-display font-bold uppercase tracking-widest text-slate-400">
            Since 1964 · 60+ Years of Excellence
          </p>
        </div>
      </div>
    </footer>
  );
}
