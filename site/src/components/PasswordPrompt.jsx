import { Sheet } from "./ConfirmTransfer.jsx";
import OnScreenKeyboard from "./OnScreenKeyboard.jsx";

const PIN_CIRCLE_COUNT = 6;

export default function PasswordPrompt({ password, pinLength = 6, onPasswordChange, onCancel, onContinue }) {
  return (
    <Sheet
      title="Enter your PIN to confirm"
      onCancel={onCancel}
      topRightClose
      showCancel={false}
      centerTitle
      titleStyle={{ marginTop: 28, marginBottom: 8, fontSize: 24, textAlign: "center" }}
      sheetStyle={passwordSheetStyle}
    >
      <div
        role="group"
        aria-label={`${pinLength}-digit password`}
        style={{ display: "flex", justifyContent: "center", gap: 10, margin: "16px 0 10px", flexShrink: 0 }}
      >
        {Array.from(
          { length: password.length === pinLength ? pinLength : PIN_CIRCLE_COUNT },
          (_, index) => (
          <span
            key={index}
            aria-hidden="true"
            style={{
              width: 38,
              height: 38,
              display: "grid",
              placeItems: "center",
              border: `1.5px solid ${index < password.length ? "#7a1c9e" : "#d8cddd"}`,
              borderRadius: "50%",
              color: "#7a1c9e",
              fontSize: 22,
              lineHeight: 1,
            }}
          >
            {index < password.length ? "•" : ""}
          </span>
          ),
        )}
      </div>
      <button
        type="button"
        onClick={onCancel}
        style={{
          alignSelf: "center",
          border: 0,
          background: "transparent",
          color: "#68616b",
          fontSize: 15,
          fontWeight: 600,
          cursor: "pointer",
          padding: "8px 12px",
          margin: "28px auto 8px",
          flexShrink: 0,
        }}
      >
        Cancel
      </button>
      <OnScreenKeyboard
        password={password}
        pinLength={pinLength}
        onPasswordChange={onPasswordChange}
        onContinue={onContinue}
      />
    </Sheet>
  );
}

const passwordSheetStyle = {
  height: "65dvh",
  minHeight: 0,
  overflow: "hidden",
  padding: "12px 0 0",
  "--keypad-padding-x": "16px",
};
