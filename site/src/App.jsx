import { useCallback, useEffect, useState } from "react";
import { Routes, Route, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { apiUrl, getJson, useFetch } from "./Api.jsx";
import { bank } from "./Config.jsx";
import Home from "./components/Home.jsx";
import Transfer from "./components/Transfer.jsx";
import TransactionSuccess from "./components/TransactionSuccess.jsx";
import { Loading } from "./components/Loading.jsx";
import ErrorScreen from "./components/ErrorScreen.jsx";
import PageNotFound from "./components/PageNotFound.jsx";

//use this cache to store the fetched user once when the whole thing loads and never fetch it again
const CACHE = {
  users: new Map(),
  cached_user: null,
  cached_default_receiver: null
};

function useCachedUser(userId) {
  const cachedUser = CACHE.users.get(userId) || (CACHE.cached_user?.userid === userId ? CACHE.cached_user : null);
  const [state, setState] = useState(() => ({ data: cachedUser, loading: !cachedUser && Boolean(userId), error: null }));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const cached = CACHE.users.get(userId) || (CACHE.cached_user?.userid === userId ? CACHE.cached_user : null);
    if (cached) {
      setState({ data: cached, loading: false, error: null });
      return undefined;
    }
    if (!userId) {
      setState({ data: null, loading: false, error: null });
      return undefined;
    }

    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });
    getJson(apiUrl(`/users/${encodeURIComponent(userId)}`), controller.signal)
      .then((user) => {
        if (controller.signal.aborted) return;
        CACHE.users.set(userId, user);
        CACHE.cached_user = user;
        CACHE.cached_default_receiver = user.default_receiver || null;
        setState({ data: user, loading: false, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ data: null, loading: false, error: error.message });
      });
    return () => controller.abort();
  }, [userId, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  if (cachedUser) return { data: cachedUser, loading: false, error: null, retry };
  if (state.data?.userid && state.data.userid !== userId) return { data: null, loading: true, error: null, retry };
  return { ...state, retry };
}

function RefreshReceiver({ receiverId }) {
  const { data: receiver } = useFetch(apiUrl(`/users/${encodeURIComponent(receiverId)}`));

  useEffect(() => {
    if (receiver?.userid === receiverId) CACHE.users.set(receiverId, receiver);
  }, [receiverId, receiver]);

  return null;
}

// ---------- routes ----------
function HomeRoute() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [receiverRefresh, setReceiverRefresh] = useState(null);
  const { data: user, loading, error, retry } = useCachedUser(userId);
  const queryDefaultReceiverId = searchParams.get("default_receiver") || "";
  const defaultReceiverId = queryDefaultReceiverId || user?.default_receiver || "";

  if (loading) return <Loading />;
  if (error) return <ErrorScreen message={error} onRetry={retry} />;

  return (
    <>
      {receiverRefresh && <RefreshReceiver key={receiverRefresh.requestId} receiverId={receiverRefresh.receiverId} />}
      <Home
        user={user}
        bank={bank}
        defaultReceiverId={defaultReceiverId}
        onReceiverChange={(receiverId) => {
          if (receiverId) setReceiverRefresh((current) => ({ receiverId, requestId: (current?.requestId || 0) + 1 }));
        }}
        onScan={() => console.log("scan")}
        onAction={(name, selectedReceiverId) => {
          if (name === "CBE Transfer") navigate(`/transfer/?from=${encodeURIComponent(userId)}&to=${encodeURIComponent(selectedReceiverId || defaultReceiverId)}`);
          else console.log("action:", name);
        }}
      />
    </>
  );
}

function TransferRoute() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const senderId = searchParams.get("from") || userId || "";
  const { data: sender, loading: senderLoading, error: senderError, retry: retrySender } = useCachedUser(senderId);
  const requestedReceiverId = searchParams.get("to") || searchParams.get("default_receiver") || "";
  const receiverId = requestedReceiverId || sender?.default_receiver || (CACHE.cached_user?.userid === senderId ? CACHE.cached_default_receiver : "") || "";
  const { data: receiver, loading: receiverLoading, error: receiverError, retry: retryReceiver } = useCachedUser(receiverId);

  const handleSuccess = ({ transaction_id }) => {
    navigate(`/transactions/${encodeURIComponent(transaction_id)}`);
  };

  if (senderLoading || (Boolean(senderId) && !senderError && sender?.userid !== senderId) || (Boolean(receiverId) && (receiverLoading || (!receiverError && receiver?.userid !== receiverId)))) return <Loading />;
  if (senderError) return <ErrorScreen message={senderError} onRetry={retrySender} />;
  if (!receiverId) return <ErrorScreen message="This transfer link needs a default receiver ID." />;
  if (receiverError) return <ErrorScreen message={receiverError} onRetry={retryReceiver} />;

  return (
    <Transfer
      accountId={senderId}
      user={sender}
      receiver={receiver}
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
