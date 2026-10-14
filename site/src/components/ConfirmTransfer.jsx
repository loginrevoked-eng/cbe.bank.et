const PURPLE = "#7a1c9e";

export default function ConfirmTransfer({ transfer, onCancel, onContinue }) {
  return (
    <Sheet title="Please Confirm" onCancel={onCancel} showCancel={false} centerTitle>
      <ul style={styles.details}>
        <Party label="From" name={transfer.sender.name} account={transfer.sender.account} />
        <Party label="To" name={transfer.receiver.name} account={transfer.receiver.account} />
      </ul>
      <div style={styles.total}>
        <span>Total amount</span>
        <strong>ETB {Number(transfer.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>
      </div>
      {transfer.reason && <p style={styles.reason}>Remark: {transfer.reason}</p>}
      <div style={styles.actions}>
        <button type="button" onClick={onCancel} style={styles.cancelAction}>Cancel</button>
        <button type="button" onClick={onContinue} style={styles.continueAction}>Continue</button>
      </div>
    </Sheet>
  );
}

export function Sheet({ title, onCancel, children, topRightClose = false, showCancel = true, centerTitle = false }) {
  return (
    <div style={styles.backdrop} onClick={onCancel}>
      <section role="dialog" aria-modal="true" aria-labelledby="transfer-step-title" style={styles.sheet} onClick={(event) => event.stopPropagation()}>
        <div style={styles.handle} />
        <div style={{ ...styles.titleRow, ...(centerTitle ? { justifyContent: "center" } : {}) }}>
          <h2 id="transfer-step-title" style={{ ...styles.title, ...(centerTitle ? { width: "100%", textAlign: "center" } : {}) }}>{title}</h2>
          {topRightClose && (
            <button type="button" onClick={onCancel} aria-label="Close" style={styles.closeButton}>×</button>
          )}
        </div>
        {children}
        {showCancel && <button type="button" onClick={onCancel} style={styles.cancel}>Cancel</button>}
      </section>
    </div>
  );
}

function Party({ label, name, account }) {
  return (
    <li style={styles.party}>
      <span style={styles.partyLabel}>{label}</span>
      <span style={styles.partyDetails}>
        <span style={styles.partyName}>{name || "Name unavailable"}</span>
        <span style={styles.partyAccount}>{account}</span>
      </span>
    </li>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, zIndex: 1000, background: "rgba(20, 10, 25, .48)" },
  sheet: { position: "absolute", left: "50%", bottom: 0, width: "100%", maxWidth: 480, height: "min(50vh, 460px)", minHeight: 360, boxSizing: "border-box", overflowY: "auto", transform: "translateX(-50%)", borderRadius: "28px 28px 0 0", background: "#fff", padding: "16px 24px 20px", boxShadow: "0 -8px 32px rgba(0,0,0,.16)", fontFamily: "system-ui, sans-serif", color: "#241b27", display: "flex", flexDirection: "column" },
  handle: { width: 42, height: 4, borderRadius: 4, background: "#d6d0d8", margin: "0 auto 18px" },
  titleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  title: { margin: "0 0 20px", fontSize: 22, fontWeight: 700, color: PURPLE },
  closeButton: { width: 46, height: 46, marginTop: -16, marginRight: -12, marginBottom: 12, border: 0, borderRadius: "50%", background: "#fff0f0", color: "#c62828", fontSize: 36, fontWeight: 700, lineHeight: 1, cursor: "pointer" },
  details: { listStyle: "none", margin: 0, padding: 0, borderTop: "1px solid #eee9f0" },
  party: { display: "grid", gridTemplateColumns: "64px minmax(0, 1fr)", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #eee9f0" },
  partyLabel: { color: "#756d79", fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em" },
  partyDetails: { minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3, textAlign: "right" },
  partyName: { fontSize: 16, fontWeight: 700, color: "#241b27" },
  partyAccount: { color: "#68616b", fontSize: 14, fontVariantNumeric: "tabular-nums" },
  total: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14, fontSize: 16 },
  reason: { margin: "8px 0 0", color: "#68616b", fontSize: 13 },
  actions: { display: "flex", gap: 12, marginTop: "auto", paddingTop: 20 },
  cancelAction: { flex: 1, height: 50, border: `1.5px solid ${PURPLE}`, borderRadius: 25, background: "#fff", color: PURPLE, fontSize: 16, fontWeight: 600, cursor: "pointer" },
  continueAction: { flex: 1, height: 50, border: 0, borderRadius: 25, background: PURPLE, color: "white", fontSize: 16, fontWeight: 600, cursor: "pointer" },
  cancel: { width: "100%", height: 44, marginTop: 8, border: 0, background: "transparent", color: "#665c69", fontSize: 15, cursor: "pointer" },
};

export const transferSheetStyles = styles;
