import { Sheet, transferSheetStyles as styles } from "./ConfirmTransfer.jsx";

export default function ReceiverFullName({ name, onNameChange, transfer, onCancel, onContinue, error }) {
  return (
    <Sheet title="Receiver’s full name" onCancel={onCancel}>
      <p style={{ margin: "0 0 16px", color: "#68616b", fontSize: 14 }}>
        ETB {Number(transfer.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })} to {transfer.receiver.account}
      </p>
      <label htmlFor="receiver-full-name" style={{ display: "block", marginBottom: 7, fontSize: 14, fontWeight: 600 }}>Full name</label>
      <input
        id="receiver-full-name"
        type="text"
        autoComplete="name"
        autoFocus
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        onKeyDown={(event) => event.key === "Enter" && onContinue()}
        style={{ width: "100%", height: 52, boxSizing: "border-box", padding: "0 14px", border: "1px solid #d8cddd", borderRadius: 14, fontSize: 17, outlineColor: "#7a1c9e" }}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "receiver-name-error" : undefined}
      />
      {error && <p id="receiver-name-error" role="alert" style={{ margin: "8px 0 0", color: "#b42318", fontSize: 14 }}>{error}</p>}
      <button type="button" onClick={onContinue} style={styles.primary}>Send transfer</button>
    </Sheet>
  );
}
