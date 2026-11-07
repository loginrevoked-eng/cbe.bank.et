import { useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import LoginPage from "../components/LoginPage.jsx";
import { prefetchUser } from "./userCache.js";

export default function LoginRoute({ bankLogo, lockIcon, onPinLengthChange }) {
  const { userId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    prefetchUser(userId).catch(() => {});
  }, [userId]);

  return (
    <LoginPage
      userId={userId}
      bankLogo={bankLogo}
      lockIcon={lockIcon}
      onSubmit={(submittedUserId, pin, method) => {
        if (method === "pin" && typeof pin === "string") onPinLengthChange?.(pin.length);
        navigate(`/home/${encodeURIComponent(submittedUserId)}`);
      }}
    />
  );
}
