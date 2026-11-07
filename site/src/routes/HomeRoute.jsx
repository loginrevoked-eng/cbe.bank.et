import { useParams } from "react-router-dom";
import { bank } from "../Config.jsx";
import ErrorScreen from "../components/ErrorScreen.jsx";
import Home from "../components/Home.jsx";
import { Loading } from "../components/Loading.jsx";
import { useCachedUser } from "./userCache.js";

export default function HomeRoute() {
  const { userId } = useParams();
  const { data: user, loading, error, retry } = useCachedUser(userId);

  if (loading) return <Loading />;
  if (error) return <ErrorScreen message={error} onRetry={retry} />;

  return (
    <Home
      user={user}
      bank={bank}
      onScan={() => console.log("scan")}
      onAction={(name) => console.log("action:", name)}
    />
  );
}
