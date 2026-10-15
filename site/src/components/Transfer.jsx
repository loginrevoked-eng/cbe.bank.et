import { useRef, useState } from "react";
import { apiUrl, useFetch, usePost } from "../Api.jsx";
import ConfirmTransfer from "./ConfirmTransfer.jsx";
import EnterPassword from "./EnterPassword.jsx";
import LoadingScreen from "./LoadingScreen.jsx";
import ErrorToast from "./ErrorToast.jsx";

const PURPLE = "#7B1FA2";
const PURPLE_DARK = "#6A1B9A";
const PURPLE_SOFT = "#F1E4F6";
const BENEFICIARIES = [
  { id: "u2", name: "Bob Roe", account: "0987654321" },
  { id: "u3", name: "Sara Bekele", account: "1122334455" },
];

// "1000123458657" -> "1*******8657" (already-masked numbers pass through)
const maskAccount = (n = "") => {
  const str = String(n);
  if (!str || str.includes("*") || str.length < 6) return str;
  return `${str[0]}${"*".repeat(7)}${str.slice(-4)}`;
};

const initials = (name) =>
  name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

export default function Transfer({
  accountId, // sender account, taken from the /transfer/:userId URL
  user, // fetched user; drives the From Account card and recent transfers
  receiver,
  onSelectReceiver = () => {},
  onBack = () => {},
  onSuccess = () => {},
}) {
  // Adjust these field names if your user object differs
  const fromAccount = {
    name: user?.full_name ?? `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim(),
    number: maskAccount(user.account),
    balance: user?.balance ?? "0.00",
  };
  const { data: recentTransfersData } = useFetch(
    apiUrl(`/${encodeURIComponent(accountId)}/recent_transfers/10`)
  );

  const [amount, setAmount] = useState("");
  const [remark, setRemark] = useState("");
  const [showRemark, setShowRemark] = useState(false);
  const [showBalance, setShowBalance] = useState(false);
  const [listTab, setListTab] = useState("recent");
  const [removedIds, setRemovedIds] = useState([]);
  const [step, setStep] = useState(null);
  const [transferDraft, setTransferDraft] = useState(null);
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState(null);
  const { post, loading: submitting } = usePost(apiUrl("/generate-receipt"));
  const amountRef = useRef(null);

  const recent = (recentTransfersData ?? []).filter((item) => !removedIds.includes(item.id));
  const list = listTab === "recent" ? recent : BENEFICIARIES;
  const canContinue = Boolean(receiver) && Number(amount) > 0;

  // Continue begins a review-first confirmation flow.
  const handleContinue = () => {
    if (!canContinue || submitting) return;
    setToast(null);
    setTransferDraft({
      user_id: accountId,
      receiver_id: receiver.userid,
      sender: { account: user.account, name: user.full_name ?? `${user.first_name} ${user.last_name}`.trim() },
      receiver: { account: receiver.account, name: receiver.full_name ?? `${receiver.first_name} ${receiver.last_name}`.trim() },
      amount: Number(amount),
      reason: remark.trim() || undefined,
    });
    setStep("confirm");
  };

  const handleSubmitTransfer = async () => {
    if (submitting || !transferDraft) return;
    setStep(null);
    setToast(null);
    try {
      const result = await post(transferDraft);
      setPassword("");
      onSuccess(result);
    } catch (err) {
      setPassword("");
      setStep(null);
      setToast({ id: Date.now(), message: err?.message || "Transfer failed. Try again." });
    }
  };

  const handlePasswordContinue = () => {
    if (submitting) return;
    if (password.length !== 6) return;
    handleSubmitTransfer();
  };

  const closeFlow = () => {
    if (submitting) return;
    setStep(null);
    setPassword("");
  };

  return (
    <div style={styles.screen}>
      {/* Header */}
      <header style={styles.header}>
        <button type="button" aria-label="Back" onClick={onBack} style={styles.backBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 style={styles.title}>CBE Transfer</h1>
      </header>

      <main style={styles.sheet}>
        {/* From account (static, no Change dropdown) */}
        <section style={styles.fromCard} aria-label="From account">
          <div style={styles.fromLabel}>From Account</div>
          <div style={styles.fromName}>
            {fromAccount.name} - {fromAccount.number}
          </div>
          <div style={styles.balanceRow}>
            <span style={styles.balance}>
              {showBalance ? `ETB ${fromAccount.balance}` : "••••••"}
            </span>
            <button
              type="button"
              aria-label={showBalance ? "Hide balance" : "Show balance"}
              onClick={() => setShowBalance((v) => !v)}
              style={styles.iconBtn}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B8C0BF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {showBalance ? (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                ) : (
                  <>
                    <path d="M17.94 17.94A10.94 10.94 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </section>

        {/* Account number */}
        <div style={styles.receiverAccount}>
          {receiver && <div style={styles.receiverName}>{receiver.full_name ?? `${receiver.first_name ?? ""} ${receiver.last_name ?? ""}`.trim()}</div>}
          <div style={styles.field}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 20h18" />
            </svg>
            <input
              type="text"
              inputMode="numeric"
              placeholder="Account Number"
              value={receiver?.account ?? ""}
              readOnly
              style={styles.input}
            />
            <button type="button" aria-label="Scan QR code" style={styles.iconBtn} disabled={Boolean(receiver)}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="1.8" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <path d="M14 14h3v3h-3zM20 14v1M14 20h2M19 19h2v2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Amount */}
        <div style={styles.field} onClick={() => amountRef.current?.focus()}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 12V8H6a2 2 0 010-4h12v4M4 6v12a2 2 0 002 2h14v-4" />
            <path d="M18 12a2 2 0 000 4h4v-4z" />
          </svg>
          <input
            type="text"
            inputMode="decimal"
            ref={amountRef}
            placeholder="Amount*"
            value={amount}
            onChange={(e) => {
              const v = e.target.value;
              if (/^\d*\.?\d{0,2}$/.test(v)) setAmount(v);
            }}
            style={styles.input}
          />
          <button type="button" aria-label="Calculator" style={styles.iconBtn}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="3" />
              <rect x="7.5" y="5.5" width="9" height="3.5" rx="0.5" />
              <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" strokeWidth="2.4" />
            </svg>
          </button>
        </div>

        {/* Remark */}
        {showRemark ? (
          <input
            type="text"
            placeholder="Remark"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            style={styles.remarkInput}
            autoFocus
          />
        ) : (
          <button type="button" onClick={() => setShowRemark(true)} style={styles.remarkBtn}>
            <span style={styles.plusBox}>+</span>
            <span style={{ fontSize: 16 }}>Add remark</span>
            <em style={styles.remarkHint}>*Default: MB transfer</em>
          </button>
        )}

        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          style={{ ...styles.continueBtn, cursor: canContinue ? "pointer" : "default" }}
        >
          Continue
        </button>

        <div role="tablist" style={styles.listTabs}>
          {[["recent", "Recent Transfers"], ["beneficiaries", "Beneficiaries"]].map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={listTab === key}
              onClick={() => setListTab(key)}
              style={{ ...styles.listTab, color: listTab === key ? PURPLE_DARK : "#3B1C4A", borderBottom: listTab === key ? `3px solid ${PURPLE}` : "3px solid transparent" }}
            >
              {label}
            </button>
          ))}
        </div>
        <ul style={styles.list}>
          {list.length === 0 && <li style={styles.empty}>{listTab === "recent" ? "No recent transfers yet." : "No beneficiaries yet."}</li>}
          {list.map((p) => (
            <li key={p.id} style={styles.row}>
              <button
                type="button"
                onClick={() => onSelectReceiver(p.id)}
                style={styles.rowMain}
              >
                <span style={styles.avatar}>{initials(p.name)}</span>
                <span style={{ textAlign: "left", minWidth: 0 }}>
                  <span style={styles.rowName}>{p.name}</span>
                  <span style={styles.rowAcct}>{maskAccount(p.account)}</span>
                </span>
              </button>
              {listTab === "recent" && (
                <button
                  type="button"
                  aria-label={`Remove ${p.name} from recent transfers`}
                  onClick={() => setRemovedIds((ids) => [...ids, p.id])}
                  style={styles.iconBtn}
                >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A8A8A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6" />
                  </svg>
                </button>
              )}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={PURPLE} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </li>
          ))}
        </ul>
      </main>
      {step === "confirm" && transferDraft && (
        <ConfirmTransfer transfer={transferDraft} onCancel={closeFlow} onContinue={() => setStep("password")} />
      )}
      {step === "password" && (
        <EnterPassword password={password} onPasswordChange={setPassword} onCancel={closeFlow} onContinue={handlePasswordContinue} />
      )}
      {submitting && <LoadingScreen />}
      {toast && <ErrorToast key={toast.id} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

const styles = {
  screen: {
    minHeight: "100dvh",
    maxWidth: 480,
    margin: "0 auto",
    background: PURPLE,
    fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
    color: "#1c1c1c",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "max(12px, env(safe-area-inset-top)) 14px 14px",
  },
  backBtn: {
    width: 42,
    height: 42,
    borderRadius: "50%",
    border: "none",
    background: "rgba(255,255,255,0.18)",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
  },
  title: { margin: 0, fontSize: 24, fontWeight: 700, color: "#fff" },
  sheet: {
    background: "#F8F8FC",
    borderRadius: "28px 28px 0 0",
    padding: "18px 14px 20px",
    minHeight: "calc(100dvh - 76px)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  fromCard: {
    background: "#243230",
    borderRadius: 20,
    padding: "14px 16px",
    color: "#F7E9B5",
  },
  fromLabel: { fontSize: 16, marginBottom: 4 },
  fromName: { fontSize: 16, fontWeight: 500 },
  balanceRow: { display: "flex", alignItems: "center", gap: 10, marginTop: 6, color: "#fff" },
  balance: { fontSize: 16, letterSpacing: 1 },
  receiverAccount: { display: "flex", flexDirection: "column", gap: 6 },
  receiverName: { alignSelf: "flex-start", color: PURPLE, fontSize: 14, fontWeight: 600, fontStyle: "italic" },
  field: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    borderRadius: 18,
    padding: "0 14px",
    height: 64,
    boxShadow: "0 2px 8px rgba(70, 20, 90, 0.12)",
    border: "1px solid #EDE7F1",
  },
  input: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    height: "100%",
    pointerEvents: "auto",
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 18,
    color: "#1c1c1c",
  },
  iconBtn: {
    background: "none",
    border: "none",
    padding: 4,
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
  },
  remarkBtn: {
    display: "flex",
    alignItems: "center",
    gap: 9,
    background: "none",
    border: "none",
    padding: "0 4px",
    cursor: "pointer",
    color: "#1c1c1c",
  },
  plusBox: {
    width: 24,
    height: 24,
    border: `1.5px solid ${PURPLE}`,
    color: PURPLE,
    borderRadius: 7,
    display: "grid",
    placeItems: "center",
    fontSize: 20,
    lineHeight: 1,
  },
  remarkHint: { fontSize: 12, color: "#555", fontWeight: 600 },
  remarkInput: {
    height: 44,
    borderRadius: 14,
    border: "1px solid #D9CCE0",
    padding: "0 16px",
    fontSize: 16,
    outline: "none",
    background: "#fff",
  },
  continueBtn: {
    height: 56,
    borderRadius: 28,
    border: "none",
    background: PURPLE,
    color: "#fff",
    fontSize: 18,
    fontWeight: 600,
    cursor: "pointer",
  },
  listTabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    background: "#EFF1FA",
    borderRadius: 14,
    padding: "4px 4px 0",
  },
  listTab: {
    background: "none",
    border: "none",
    padding: "8px 0",
    fontSize: 15,
    fontWeight: 600,
    cursor: "pointer",
  },
  list: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    background: "#fff",
    borderRadius: 18,
    padding: "10px 12px",
    boxShadow: "0 2px 8px rgba(70, 20, 90, 0.08)",
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "none",
    border: "none",
    padding: 0,
    cursor: "pointer",
  },
  avatar: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: "50%",
    background: PURPLE_SOFT,
    color: PURPLE,
    display: "grid",
    placeItems: "center",
    fontSize: 15,
    fontWeight: 600,
  },
  rowName: {
    display: "block",
    fontSize: 16,
    fontWeight: 500,
    color: "#1c1c1c",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  rowAcct: { display: "block", fontSize: 13, color: "#777", marginTop: 2 },
  empty: { textAlign: "center", color: "#777", padding: 16 },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(30, 10, 40, 0.55)",
    display: "grid",
    placeItems: "center",
    padding: 20,
    zIndex: 1000,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    background: "#fff",
    borderRadius: 28,
    padding: "28px 22px 22px",
    boxShadow: "0 12px 40px rgba(40, 10, 60, 0.35)",
  },
  modalTitle: { margin: 0, fontSize: 22, fontWeight: 700, color: PURPLE_DARK },
  modalSub: { margin: "6px 0 18px", fontSize: 15, color: "#666" },
  modalInput: {
    width: "100%",
    boxSizing: "border-box",
    height: 60,
    borderRadius: 18,
    border: "1.5px solid #D9CCE0",
    padding: "0 16px",
    fontSize: 18,
    outline: "none",
  },
  errorBanner: {
    background: "#FDECEA",
    color: "#B71C1C",
    borderRadius: 16,
    padding: "12px 16px",
    fontSize: 15,
    whiteSpace: "pre-wrap",
  },
  modalError: { marginTop: 8, fontSize: 14, color: "#C62828" },
  modalActions: { display: "flex", gap: 12, marginTop: 20 },
  modalCancel: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    border: `1.5px solid ${PURPLE}`,
    background: "#fff",
    color: PURPLE,
    fontSize: 17,
    fontWeight: 600,
    cursor: "pointer",
  },
  modalConfirm: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    border: "none",
    background: PURPLE,
    color: "#fff",
    fontSize: 17,
    fontWeight: 600,
    cursor: "pointer",
  },
};
