import { Routes, Route, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiUrl, useFetch } from "./Api.jsx";
import { bank } from "./Config.jsx";
import Home from "./components/Home.jsx";
import Transfer from "./components/Transfer.jsx";
import TransactionSuccess from "./components/TransactionSuccess.jsx";
import { Loading } from "./components/Loading.jsx";
import ErrorScreen from "./components/ErrorScreen.jsx";
import PageNotFound from "./components/PageNotFound.jsx";




// ---------- routes ----------
function HomeRoute() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: user, loading, error, retry } = useFetch(apiUrl(`/users/${encodeURIComponent(userId)}`));
  const defaultReceiverId = searchParams.get("default_receiver") || user?.default_receiver || "";

  if (loading) return <Loading />;
  if (error) return <ErrorScreen message={error} onRetry={retry} />;

  return (
    <Home
      user={user}
      bank={bank}
      defaultReceiverId={defaultReceiverId}
      onScan={() => console.log("scan")}
      onAction={(name, selectedReceiverId) => {
        if (name === "CBE Transfer") navigate(`/transfer/?from=${encodeURIComponent(userId)}&to=${encodeURIComponent(selectedReceiverId || defaultReceiverId)}`);
        else console.log("action:", name);
      }}
    />
  );
}

function TransferRoute() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const senderId = searchParams.get("from") || userId || "";
  const senderFetch = useFetch(senderId ? apiUrl(`/users/${encodeURIComponent(senderId)}`) : null);
  const receiverId = searchParams.get("to") || senderFetch.data?.default_receiver || "";
  const receiverFetch = useFetch(receiverId ? apiUrl(`/users/${encodeURIComponent(receiverId)}`) : null);

  const handleSuccess = ({ transaction_id }) => {
    navigate(`/transactions/${encodeURIComponent(transaction_id)}`);
  };

  if (senderFetch.loading || (Boolean(senderId) && !senderFetch.error && senderFetch.data?.userid !== senderId) || (Boolean(receiverId) && (receiverFetch.loading || (!receiverFetch.error && receiverFetch.data?.userid !== receiverId)))) return <Loading />;
  if (senderFetch.error) return <ErrorScreen message={senderFetch.error} onRetry={senderFetch.retry} />;
  if (!receiverId) return <ErrorScreen message="This transfer link needs a default receiver ID." />;
  if (receiverFetch.error) return <ErrorScreen message={receiverFetch.error} onRetry={receiverFetch.retry} />;

  return (
    <Transfer
      accountId={senderId}
      user={senderFetch.data}
      receiver={receiverFetch.data}
      onBack={() => navigate(`/${encodeURIComponent(senderId)}`)}
      onSelectReceiver={(id) => navigate(`/transfer/?from=${encodeURIComponent(senderId)}&to=${encodeURIComponent(id)}`)}
      onSuccess={handleSuccess}
    />
  );
}

function TransactionRoute() {
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
      onClose={() => navigate(`/${encodeURIComponent(transaction.user_id)}`, { replace: true })}
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/:userId" element={<HomeRoute />} />
      <Route path="/transfer" element={<TransferRoute />} />
      <Route path="/transfer/:userId" element={<TransferRoute />} />
      <Route path="/transactions/:txId" element={<TransactionRoute />} />
      <Route path="*" element={<PageNotFound message="Invalid link" />} />
    </Routes>
  );
}
