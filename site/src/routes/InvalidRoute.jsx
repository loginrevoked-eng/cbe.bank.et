import { useLocation } from "react-router-dom";
import PageNotFound from "../components/PageNotFound.jsx";

export default function InvalidRoute({
  message = "This route {full url} is invalid, please double check",
  kind = "route",
} = {}) {
  const location = useLocation();
  const fullUrl = `${window.location.origin}${location.pathname}${location.search}${location.hash}`;
  const displayMessage = message.replace("{full url}", fullUrl);

  return <PageNotFound kind={kind} message={displayMessage} />;
}
