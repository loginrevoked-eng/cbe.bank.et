import { Fragment } from "react";
import { QRCodeSVG } from "qrcode.react";


// Tiny template DSL: mixes plain strings and JSX in one template
const tpl = (strings, ...values) =>
  strings.flatMap((s, i) => [s, <Fragment key={i}>{values[i]}</Fragment>]);
const Bold = (x) => <strong>{x}</strong>;

function ShieldCheck({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4Zm-1.2 15.2-3.5-3.5 1.4-1.4 2.1 2.1 5.1-5.1 1.4 1.4-6.5 6.5Z" />
    </svg>
  );
}

function Check({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor"
      strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 12.5 9.5 17.5 19.5 6.5" />
    </svg>
  );
}

const Icon = ({ children }) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke={"#000000"}
    style={{ color: "#000000" }}
    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);

const ReceiptIcon = () => (
  <Icon>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
    <path d="M9 8h6M9 12h6" />
  </Icon>
);

const ScreenshotIcon = () => (
  <Icon>
    <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
    <path d="M9 9h6v6H9Z" />
  </Icon>
);

const ShareIcon = () => (
  <Icon>
    <circle cx="18" cy="5" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="19" r="2.5" />
    <path d="M8.2 10.9l7.6-4.4M8.2 13.1l7.6 4.4" />
  </Icon>
);

function BankFooter({ bank }) {
  return (
    <div className="mx-auto mt-3 flex w-fit min-w-[280px] items-center justify-center gap-4">
      <img
        src={bank.logo}
        alt={`${bank.name} logo`}
        className="h-10 w-auto max-w-[120px] shrink-0 object-contain"
      />
      <div className="whitespace-nowrap leading-tight">
        <p className="text-base font-bold text-neutral-700">{bank.name}</p>
        <p className="text-sm text-neutral-500">{bank.tagline}</p>
      </div>
    </div>
  );
}

export default function TransactionSuccess({
  transaction: t,
  bank,
  onReceipt,
  onScreenshot,
  onShare,
  onClose,
}) {
  const c = t.currency;
  const Money = (x) => `${c}${x}`;
  const Acct = (x) => `${c}-${x}`;

  return (
    // data-receipt: the element ScreenshotFrame captures
    <main
      data-receipt
      className="mx-auto min-h-screen w-full max-w-[480px] overflow-hidden bg-white shadow-xl"
    >
      {/* Purple header */}
      <header className="flex h-[230px] items-start gap-3 bg-[#7a1c9e] px-5 pt-16 text-white">
        <ShieldCheck className="h-8 w-8 shrink-0" />
        <div className="leading-tight">
          <h1 className="text-xl font-bold">Thank you</h1>
          <p className="text-sm text-white/80">Success</p>
        </div>
      </header>

      {/* White sheet overlapping the header */}
      <section className="relative -mt-12 rounded-t-[56px] bg-white pb-8">
        {/* Check badge sitting on the seam */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white p-2.5">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-[#7a1c9e] text-white">
            <Check className="h-14 w-14" />
          </div>
        </div>

        <p className="px-5 pt-[88px] text-center text-base text-neutral-800">
          Transaction Completed Successfully!
        </p>

        {/* Summary card */}
        <div className="mx-4 mt-6 rounded-3xl bg-neutral-100 px-4 pb-5 pt-4">
          <h2 className="text-base text-neutral-400">Transaction Summary</h2>

          <p className="mt-3 text-[17px] leading-8">
            {tpl`
              ${c} ${Bold(t.amount)} has been debited from ${Bold(t.from.name)} ${Acct(t.from.account)}
              for ${Bold(t.to.name)} ${Acct(t.to.account)} on ${Bold(t.date)}
              with transaction ID: ${Bold(t.transactionId)}. Reason: ${t.reason}
              Total Amount Debited: ${Money(t.total)} with Service Charge of ${Money(t.serviceCharge)},
              VAT (${t.percentages.VAT}) of ${Money(t.vat)} and
              Disaster Recovery (${t.percentages.disasterRecovery}) of ${Money(t.disasterRecovery)}.
            `}
          </p>

          {/* QR code */}
          <div className="mt-3 flex justify-center">
            <div className="rounded-2xl border-4 border-neutral-500 bg-white p-3">
              <QRCodeSVG value={t.qrValue} size={168} level="M" />
            </div>
          </div>

          <BankFooter bank={bank} />
        </div>

        {/* Action icons (left out of the screenshot) */}
        <div
          data-capture-ignore="true"
          className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1"
        >
          {[
            ["Receipt", ReceiptIcon, onReceipt],
            ["Screenshot", ScreenshotIcon, onScreenshot],
            ["Share", ShareIcon, onShare],
          ].map(([label, Glyph, onClick]) => (
            <button
              key={label}
              type="button"
              onClick={onClick}
              style={{ color: "#000000" }}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm hover:bg-neutral-100 active:bg-neutral-200"
            >
              <Glyph />
              <span style={{ color: "#000000" }}>{label}</span>
            </button>
          ))}
        </div>

        {/* Close button (left out of the screenshot) */}
        <div data-capture-ignore="true" className="mx-4 mt-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-full border border-neutral-400 bg-neutral-200 py-3 text-base font-medium text-neutral-700 active:bg-neutral-300"
          >
            Close
          </button>
        </div>
      </section>
    </main>
  );
}