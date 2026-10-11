import { useEffect, useState } from "react";
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import Home from "./components/Home.jsx";
import TransactionSuccess from "./components/TransactionSuccess.jsx";
import { Loading, ErrorScreen } from "./components/Loading.jsx";
import bankLogo from "../../assets/cbe_bank.png"; // your existing path

const bank = {
  name: "Commercial Bank of Ethiopia",
  tagline: "The bank you can always rely on!",
  logo: bankLogo,
};


async function getJson(url, signal) {
  const res = await fetch(url, { signal, credentials: "include" });
  if (!res.ok) {
    throw new Error(res.status === 404 ? "Not found" : `Request failed (${res.status})`);
  }
  return res.json();
}

function useFetch(url) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState({ data: null, loading: true, error: null });

    getJson(url, controller.signal)
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((err) => {
        if (err.name !== "AbortError") {
          setState({ data: null, loading: false, error: err.message });
        }
      });

    return () => controller.abort();
  }, [url, attempt]);

  return { ...state, retry: () => setAttempt((n) => n + 1) };
}

// ---------- routes ----------
function HomeRoute() {
  const { accId } = useParams();
  const navigate = useNavigate();
  const { data: user, loading, error, retry } = useFetch(`/api/accounts/${encodeURIComponent(accId)}`);;

  if (loading) return <Loading />;
  if (error) return <ErrorScreen message={error} onRetry={retry} />;

  return (
    <Home
      user={user}
      bank={bank}
      account={user.account}
      onScan={() => console.log("scan")}
      onAction={(name) => {
        if (name === "CBE Transfer") navigate("/transactions/FT000000XXXX"); // temporary preview id
        else console.log("action:", name);
      }}
    />
  );
}

function SuccessRoute() {
  const { txNum } = useParams();
  const navigate = useNavigate();
  const { data: transaction, loading, error, retry } = useFetch(`/api/transactions/${encodeURIComponent(txNum)}`);

  if (loading) return <Loading />;
  if (error) return <ErrorScreen message={error} onRetry={retry} />;

  return (
    <TransactionSuccess
      transaction={transaction}
      bank={bank}
      onReceipt={() => { window.location.href = transaction.receiptUrl; }}
      onScreenshot={() => console.log("screenshot")}
      onShare={() => console.log("share")}
      onClose={() => navigate(`/${transaction.accId}`, { replace: true })
      }
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/:accId" element={<HomeRoute />} />
      <Route path="/transactions/:txNum" element={<SuccessRoute />} />
      <Route path="*" element={<ErrorScreen message="Invalid link" />} />
    </Routes>
  );
}