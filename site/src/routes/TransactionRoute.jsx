import { useNavigate, useParams } from "react-router-dom";
import { apiUrl, useFetch } from "../api/http.js";
import { bank } from "../Config.jsx";
import ErrorScreen from "../components/ErrorScreen.jsx";
import { Loading } from "../components/Loading.jsx";
import TransactionSuccess from "../components/TransactionSuccess.jsx";

export default function TransactionRoute() {
  const { txId } = useParams();
  const navigate = useNavigate();
  const { data: transaction, loading, error, retry } = useFetch(apiUrl(`/transactions/${encodeURIComponent(txId)}`));

  if (loading) return <Loading />;
  if (error) return <ErrorScreen message={error} onRetry={retry} />;

  return (
    <TransactionSuccess
      transaction={transaction}
      bank={bank}
      onReceipt={() => { window.location.href = transaction.pdf_url; }}
      onScreenshot={() => console.log("screenshot")}
      onShare={() => console.log("share")}
      onClose={() => navigate(`/home/${encodeURIComponent(transaction.user_id)}`, { replace: true })}
    />
  );
}
