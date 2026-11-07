import { Check, Delete } from "lucide-react";

export default function OnScreenKeyboard({ password, pinLength = 6, onPasswordChange, onContinue }) {
  const canContinue = password.length === pinLength;
  const addDigit = (digit) => {
    if (password.length < pinLength) onPasswordChange(`${password}${digit}`);
  };
  const removeDigit = () => onPasswordChange(password.slice(0, -1));

  return (
    <div aria-label="Numeric password keypad" style={styles.keypad}>
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
        <button
          key={digit}
          type="button"
          onClick={() => addDigit(digit)}
          disabled={password.length >= pinLength}
          style={styles.key}
          aria-label={digit}
        >
          {digit}
        </button>
      ))}
      <button type="button" onClick={removeDigit} style={styles.key} aria-label="Delete last digit">
        <Delete size={23} />
      </button>
      <button
        type="button"
        onClick={() => addDigit("0")}
        disabled={password.length >= pinLength}
        style={styles.key}
        aria-label="0"
      >
        0
      </button>
      <button
        type="button"
        onClick={onContinue}
        disabled={!canContinue}
        style={{
          ...styles.key,
          background: canContinue ? "#7a1c9e" : "#eee8f0",
          borderColor: canContinue ? "#7a1c9e" : "#eee8f0",
          color: canContinue ? "#fff" : "#9b91a0",
        }}
        aria-label="Done"
      >
        <Check size={20} strokeWidth={2.8} />
      </button>
    </div>
  );
}

const styles = {
  keypad: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gridTemplateRows: "repeat(4, 1fr)",
    gap: 6,
    width: "100%",
    maxWidth: "none",
    boxSizing: "border-box",
    paddingLeft: "var(--keypad-padding-x, 0px)",
    paddingRight: "var(--keypad-padding-x, 0px)",
    height: "55%",
    maxHeight: "55%",
    margin: "auto 0 0",
    flex: "0 0 55%",
    minHeight: 0,
  },
  key: {
    width: "100%",
    height: "100%",
    minHeight: 0,
    display: "grid",
    placeItems: "center",
    border: "1px solid #e9e3ec",
    borderRadius: 12,
    background: "#e5e7eb",
    color: "#261b2b",
    fontSize: 18,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(25, 10, 30, .06)",
  },
};
