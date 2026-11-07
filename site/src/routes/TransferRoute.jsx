import { useNavigate, useParams } from "react-router-dom";
import ErrorScreen from "../components/ErrorScreen.jsx";
import { Loading } from "../components/Loading.jsx";
import Transfer from "../components/Transfer.jsx";
import { updateCachedUserBalance, useCachedUser } from "./userCache.js";

export default function TransferRoute({ pinLength = 6 }) {
  const { userId } = useParams();
  const navigate = useNavigate();
  const senderId = userId || "";
  const { data: sender, loading, error, retry } = useCachedUser(senderId);

  const handleSuccess = ({ transaction_id }) => {
    navigate(`/receipt/${encodeURIComponent(transaction_id)}`);
  };
  const handleSubmitSuccess = (currentBalance) => {
    updateCachedUserBalance(senderId, currentBalance, sender);
  };

  if (loading || (Boolean(senderId) && !error && sender?.userid !== senderId)) return <Loading />;
  if (error) return <ErrorScreen message={error} onRetry={retry} />;
  if (!senderId) return <ErrorScreen message="This transfer link needs a sender ID." />;

  return (
    <Transfer
      accountId={senderId}
      user={sender}
      pinLength={pinLength}
      onBack={() => navigate(`/home/${encodeURIComponent(senderId)}`)}
      onSubmitSuccess={handleSubmitSuccess}
      onSuccess={handleSuccess}
    />
  );
}
