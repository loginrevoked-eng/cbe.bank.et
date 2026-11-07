export function createAccountLookupSocket({ userId, onResult, onError }) {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(
    `${protocol}//${window.location.host}/ws/accountlookup/${encodeURIComponent(userId)}`
  );
  let latestRequestId = 0;
  let pendingRequest = null;
  const invalidate = () => {
    latestRequestId += 1;
    pendingRequest = null;
  };

  socket.addEventListener("open", () => {
    if (!pendingRequest) return;
    socket.send(JSON.stringify(pendingRequest));
    pendingRequest = null;
  });

  socket.addEventListener("message", (event) => {
    try {
      const response = JSON.parse(event.data);
      if (response.request_id === latestRequestId) onResult?.(response);
    } catch (error) {
      onError?.(error);
    }
  });

  socket.addEventListener("error", () => onError?.(new Error("Account lookup connection failed")));

  return {
    search(query, max_accs = 8) {
      const normalizedQuery = query.trim();
      if (!normalizedQuery) {
        invalidate();
        return;
      }
      const request = {
        request_id: ++latestRequestId,
        ...( /^\d+$/.test(normalizedQuery)
          ? { account: normalizedQuery }
          : { name: normalizedQuery }),
        max_accs,
      };
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(request));
      } else if (socket.readyState === WebSocket.CONNECTING) {
        pendingRequest = request;
      }
    },
    invalidate,
    close() {
      pendingRequest = null;
      socket.close();
    },
  };
}
