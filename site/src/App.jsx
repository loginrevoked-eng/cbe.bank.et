import { useState } from "react";
import { Route, Routes } from "react-router-dom";
import { bank } from "./Config.jsx";
import lockIcon from "../../assets/lock.png";
import HomeRoute from "./routes/HomeRoute.jsx";
import InvalidRoute from "./routes/InvalidRoute.jsx";
import LoginRoute from "./routes/LoginRoute.jsx";
import TransferRoute from "./routes/TransferRoute.jsx";
import TransactionRoute from "./routes/TransactionRoute.jsx";

const DEFAULT_PIN_LENGTH = 6;

export default function App() {
  const [pinLength, setPinLength] = useState(DEFAULT_PIN_LENGTH);

  return (
    <Routes>
      <Route
        path="/login/:userId"
        element={<LoginRoute bankLogo={bank.logo} lockIcon={lockIcon} onPinLengthChange={setPinLength} />}
      />
      <Route path="/home/:userId" element={<HomeRoute />} />
      <Route path="/transfer/:userId" element={<TransferRoute pinLength={pinLength} />} />
      <Route path="/receipt/:txId" element={<TransactionRoute />} />
      <Route path="*" element={<InvalidRoute />} />
    </Routes>
  );
}
