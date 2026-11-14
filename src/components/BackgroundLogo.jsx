import logoImg from '../assets/logo.png';

// Fixed full-viewport logo watermark behind all app content.
export default function BackgroundLogo() {
  return (
    <div
      aria-hidden="true"
      data-testid="background-logo"
      className="fixed inset-0 z-0 pointer-events-none select-none no-print bg-contain bg-no-repeat bg-center opacity-[0.06] dark:opacity-[0.10]"
      style={{ backgroundImage: `url('${logoImg}')` }}
    />
  );
}
