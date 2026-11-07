import { useState, isValidElement } from "react";
import { Bell, ChevronDown, Lock, Fingerprint, ArrowRight } from "lucide-react";

/* -------------------------------------------------------------------------- */
/*  Design tokens (measured from the Figma export, 392px-wide baseline)       */
/* -------------------------------------------------------------------------- */

const COLORS = {
  pageBg: "#F6F7FA",
  surface: "#FFFFFF",
  surfaceBorder: "#E9ECF4",

  gold: "#AA8738", // login button
  goldText: "#B98B3C", // Amharic title
  goldLock: "#C09A28",
  goldDivider: "#D9C9A6",

  textTitle: "#4A4A4A",
  textWelcome: "#8B8178",
  textPlaceholder: "#8A99B3",
  textInput: "#262626",
  textLabel: "#1A1A1A",
  textFooter: "#8A8A90",
  textIcon: "#262626",

  bioFrom: "#A93FBF",
  bioTo: "#7B1FA2",
  bioShadow: "rgba(142,36,170,0.32)",
};

const TEXT = {
  titleAmharic: "የኢትዮጵያ ንግድ ባንክ",
  titleEnglish: "COMMERCIAL BANK OF ETHIOPIA",
  welcome: "Welcome back",
  pinPlaceholder: "PIN",
  biometric: "USE BIOMETRICS",
  login: "Login",
  footer: "© Commercial Bank of Ethiopia",
  logoAlt: "Commercial Bank of Ethiopia",
};

const LANGUAGES = ["English", "አማርኛ"];
const PIN_RULES = { min: 4, max: 6 };

const FONT_UI = "Roboto, system-ui, -apple-system, 'Segoe UI', sans-serif";
const FONT_AMHARIC = "'Noto Sans Ethiopic', Roboto, system-ui, sans-serif";

const SHADOW_SOFT = "0 4px 14px rgba(20,30,60,0.08)";

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

// Accepts an image URL, a ready element (<MyIcon />) or a component type.
// Falls back to `fallback` when nothing is passed.
function IconSlot({ source, fallback, className }) {
  if (!source) return fallback;
  if (typeof source === "string") {
    return <img src={source} alt="" aria-hidden="true" className={className} />;
  }
  if (isValidElement(source)) return source;
  const Component = source;
  return <Component className={className} />;
}

// Filled 2x2 grid, as in the design (lucide's is outlined)
function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1.6" />
      <rect x="9" y="1" width="6" height="6" rx="1.6" />
      <rect x="1" y="9" width="6" height="6" rx="1.6" />
      <rect x="9" y="9" width="6" height="6" rx="1.6" />
    </svg>
  );
}

/* -------------------------------------------------------------------------- */
/*  Components                                                                */
/* -------------------------------------------------------------------------- */

// 44px white circle: bell / menu
function RoundIconButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B98F52]"
      style={{ backgroundColor: COLORS.surface, color: COLORS.textIcon, boxShadow: SHADOW_SOFT }}
    >
      {children}
    </button>
  );
}

// 30px-high pill dropdown
function LanguageSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex h-[30px] items-center gap-1 rounded-full border px-[11px] text-[13px] font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B98F52]"
        style={{
          backgroundColor: COLORS.surface,
          borderColor: "#E3E5EC",
          color: COLORS.textIcon,
          boxShadow: "0 2px 8px rgba(20,30,60,0.04)",
        }}
      >
        {value}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-1/2 top-full z-10 mt-2 w-28 -translate-x-1/2 overflow-hidden rounded-2xl bg-white"
          style={{ boxShadow: "0 8px 24px rgba(20,30,60,0.14)" }}
        >
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={option === value}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left text-[14px] hover:bg-neutral-50"
                style={{ color: COLORS.textInput }}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TopBar({ language, onLanguageChange }) {
  return (
    <header className="flex items-center justify-between">
      <RoundIconButton label="Notifications">
        <Bell size={18} strokeWidth={2} />
      </RoundIconButton>
      <LanguageSelect value={language} options={LANGUAGES} onChange={onLanguageChange} />
      <RoundIconButton label="Menu">
        <GridIcon />
      </RoundIconButton>
    </header>
  );
}

// Logo, names, divider, welcome line
function BrandHeader({ bankLogo }) {
  return (
    <section className="mt-[42px] flex flex-col items-center text-center">
      <img src={bankLogo} alt={TEXT.logoAlt} className="h-[100px] w-auto object-contain" />

      <h1
        className="mt-[18px] text-[18px] font-semibold leading-6"
        style={{ color: COLORS.goldText, fontFamily: FONT_AMHARIC }}
      >
        {TEXT.titleAmharic}
      </h1>

      <p
        className="mt-[10px] text-[13px] font-semibold leading-[18px] tracking-[0.12em]"
        style={{ color: COLORS.textTitle }}
      >
        {TEXT.titleEnglish}
      </p>

      <div
        className="mt-[26px] h-px w-[133px]"
        style={{ background: `linear-gradient(90deg, transparent, ${COLORS.goldDivider}, transparent)` }}
      />

      <p className="mt-6 text-[20px] font-normal leading-7" style={{ color: COLORS.textWelcome }}>
        {TEXT.welcome}
      </p>
    </section>
  );
}

// 64px card, 88% of content width, centered
function PinField({ value, onChange, lockIcon }) {
  return (
    <label
      className="mx-auto mt-[33px] flex h-16 w-[88%] items-center gap-4 rounded-3xl border px-4 focus-within:ring-2 focus-within:ring-[#B98F52]/40"
      style={{
        backgroundColor: COLORS.surface,
        borderColor: COLORS.surfaceBorder,
        boxShadow: "0 0 12px rgba(0,0,0,0.12)",
      }}
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center">
        <IconSlot
          source={lockIcon}
          className="h-5 w-5 object-contain"
          fallback={<Lock size={20} fill={COLORS.goldLock} color={COLORS.goldLock} />}
        />
      </span>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="current-password"
        maxLength={PIN_RULES.max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={TEXT.pinPlaceholder}
        aria-label={TEXT.pinPlaceholder}
        className="min-w-0 flex-1 bg-transparent text-[18px] tracking-[0.3em] outline-none placeholder:tracking-normal"
        style={{ color: COLORS.textInput, "--tw-placeholder-color": COLORS.textPlaceholder }}
      />
      <style>{`input::placeholder{color:${COLORS.textPlaceholder}}`}</style>
    </label>
  );
}

// 60px purple circle + caption
function BiometricButton({ onClick, biometricsIcon }) {
  return (
    <div className="mt-[57px] flex flex-col items-center">
      <button
        type="button"
        aria-label={TEXT.biometric}
        onClick={onClick}
        className="flex h-[60px] w-[60px] items-center justify-center rounded-full text-white transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#7B1FA2]"
        style={{
          background: `linear-gradient(145deg, ${COLORS.bioFrom}, ${COLORS.bioTo})`,
          boxShadow: `0 8px 24px ${COLORS.bioShadow}`,
        }}
      >
        <IconSlot
          source={biometricsIcon}
          className="h-7 w-7 object-contain"
          fallback={<Fingerprint size={28} strokeWidth={1.5} />}
        />
      </button>
      <span
        className="mt-[9px] text-[12px] font-bold leading-4 tracking-[0.1em]"
        style={{ color: COLORS.textLabel }}
      >
        {TEXT.biometric}
      </span>
    </div>
  );
}

// 57px full-width gold pill
function LoginButton({ disabled }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="flex h-[57px] w-full items-center justify-center gap-2 rounded-full text-[18px] font-semibold text-white transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B98F52]"
      style={{ backgroundColor: COLORS.gold, boxShadow: "none", opacity: 1 }}
    >
      {TEXT.login}
      <ArrowRight size={20} strokeWidth={2} />
    </button>
  );
}

function Footer() {
  return (
    <p
      className="mt-[25px] text-center text-[12px] leading-4 tracking-[0.025em]"
      style={{ color: COLORS.textFooter }}
    >
      {TEXT.footer}
    </p>
  );
}

/* -------------------------------------------------------------------------- */
/*  Page                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * @param lockIcon        image URL, element or component (falls back to a lock)
 * @param biometricsIcon  image URL, element or component (falls back to a fingerprint)
 * @param bankLogo        image URL / imported png
 * @param userId          passed straight through to onSubmit
 * @param onSubmit        (userId, pin, method) => void   method: "pin" | "biometric"
 */
export default function LoginPage({ lockIcon, biometricsIcon, bankLogo, onSubmit, userId }) {
  const [pin, setPin] = useState("");
  const [language, setLanguage] = useState(LANGUAGES[0]);

  const isValid = pin.length >= PIN_RULES.min;
  const handlePinChange = (value) => setPin(value.replace(/\D/g, "").slice(0, PIN_RULES.max));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isValid) onSubmit?.(userId, pin, "pin");
  };

  const handleBiometric = () => onSubmit?.(userId, null, "biometric");

  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col px-[25px] pt-[max(env(safe-area-inset-top),16px)] pb-[calc(env(safe-area-inset-bottom,0px)+24px)]"
      style={{ backgroundColor: COLORS.pageBg, fontFamily: FONT_UI }}
    >
      <TopBar language={language} onLanguageChange={setLanguage} />

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
        <BrandHeader bankLogo={bankLogo} />
        <PinField value={pin} onChange={handlePinChange} lockIcon={lockIcon} />
        <BiometricButton onClick={handleBiometric} biometricsIcon={biometricsIcon} />

        <div className="min-h-6 flex-1" />

        <LoginButton disabled={!isValid} />
        <Footer />
      </form>
    </div>
  );
}
