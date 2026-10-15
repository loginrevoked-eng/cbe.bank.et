import { Sheet } from "./ConfirmTransfer.jsx";
import { Check, Delete } from "lucide-react";

export default function EnterPassword({ password, onPasswordChange, onCancel, onContinue }) {
  const addDigit = (digit) => {
    if (password.length < 6) onPasswordChange(`${password}${digit}`);
  };
  const removeDigit = () => onPasswordChange(password.slice(0, -1));

  return (
    <Sheet title="Enter your PIN to confirm" onCancel={onCancel} topRightClose showCancel={false} centerTitle sheetStyle={passwordSheetStyle}>
      <div role="group" aria-label="6-digit password" style={{ display: "flex", justifyContent: "center", gap: 10, margin: "0 0 8px", flexShrink: 0 }}>
        {Array.from({ length: 6 }, (_, index) => (
          <span key={index} aria-hidden="true" style={{ width: 42, height: 42, display: "grid", placeItems: "center", border: `1.5px solid ${index < password.length ? "#7a1c9e" : "#d8cddd"}`, borderRadius: "50%", color: "#7a1c9e", fontSize: 28, lineHeight: 1 }}>
            {index < password.length ? "•" : ""}
          </span>
        ))}
      </div>
      <button type="button" onClick={onCancel} style={{ alignSelf: "center", border: 0, background: "transparent", color: "#68616b", fontSize: 15, fontWeight: 600, cursor: "pointer", padding: 0, flexShrink: 0 }}>Cancel</button>
      <div aria-label="Numeric password keypad" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gridTemplateRows: "repeat(4, minmax(0, 1fr))", gap: 8, width: "100%", maxWidth: 330, margin: "8px auto 0", flex: 1, minHeight: 0 }}>
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <button key={digit} type="button" onClick={() => addDigit(digit)} disabled={password.length >= 6} style={keyStyle} aria-label={digit}>{digit}</button>
        ))}
        <button type="button" onClick={removeDigit} style={keyStyle} aria-label="Delete last digit"><Delete size={23} /></button>
        <button type="button" onClick={() => addDigit("0")} disabled={password.length >= 6} style={keyStyle} aria-label="0">0</button>
        <button type="button" onClick={onContinue} disabled={password.length !== 6} style={{ ...keyStyle, background: password.length === 6 ? "#7a1c9e" : "#eee8f0", borderColor: password.length === 6 ? "#7a1c9e" : "#eee8f0", color: password.length === 6 ? "#fff" : "#9b91a0" }} aria-label="Done"><Check size={24} strokeWidth={2.8} /></button>
      </div>
    </Sheet>
  );
}

const passwordSheetStyle = {
  height: "min(94dvh, 640px)",
  minHeight: 0,
  overflow: "hidden",
  padding: "12px 20px calc(12px + env(safe-area-inset-bottom))",
};

const keyStyle = { width: "100%", height: "100%", minHeight: 0, display: "grid", placeItems: "center", border: "1px solid #e9e3ec", borderRadius: 14, background: "#f7f4f8", color: "#261b2b", fontSize: 24, fontWeight: 600, cursor: "pointer", boxShadow: "0 1px 2px rgba(25, 10, 30, .06)" };
