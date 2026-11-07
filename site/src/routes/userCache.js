import { useCallback, useEffect, useState } from "react";
import { apiUrl, getJson } from "../api/http.js";

const USER_CACHE = {
  users: new Map(),
  pendingUsers: new Map(),
  latestUser: null,
};

export function prefetchUser(userId) {
  if (!userId) return Promise.resolve(null);

  const cached = USER_CACHE.users.get(userId);
  if (cached) return Promise.resolve(cached);

  const pending = USER_CACHE.pendingUsers.get(userId);
  if (pending) return pending;

  const request = getJson(apiUrl(`/users/${encodeURIComponent(userId)}`))
    .then((user) => {
      USER_CACHE.users.set(userId, user);
      USER_CACHE.latestUser = user;
      return user;
    })
    .finally(() => USER_CACHE.pendingUsers.delete(userId));

  USER_CACHE.pendingUsers.set(userId, request);
  return request;
}

export function useCachedUser(userId) {
  const cachedUser = USER_CACHE.users.get(userId) || (USER_CACHE.latestUser?.userid === userId ? USER_CACHE.latestUser : null);
  const [state, setState] = useState(() => ({
    data: cachedUser,
    loading: !cachedUser && Boolean(userId),
    error: null,
  }));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const cached = USER_CACHE.users.get(userId) || (USER_CACHE.latestUser?.userid === userId ? USER_CACHE.latestUser : null);
    if (cached) {
      setState({ data: cached, loading: false, error: null });
      return undefined;
    }
    if (!userId) {
      setState({ data: null, loading: false, error: null });
      return undefined;
    }

    let active = true;
    setState({ data: null, loading: true, error: null });
    prefetchUser(userId)
      .then((user) => {
        if (active) setState({ data: user, loading: false, error: null });
      })
      .catch((error) => {
        if (active) setState({ data: null, loading: false, error: error.message });
      });

    return () => { active = false; };
  }, [userId, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  if (cachedUser) return { data: cachedUser, loading: false, error: null, retry };
  if (state.data?.userid && state.data.userid !== userId) return { data: null, loading: true, error: null, retry };
  return { ...state, retry };
}

export function updateCachedUserBalance(userId, balance, fallbackUser) {
  const currentUser = USER_CACHE.users.get(userId) || fallbackUser;
  if (!currentUser) return;

  const updatedUser = { ...currentUser, balance };
  USER_CACHE.users.set(userId, updatedUser);
  if (USER_CACHE.latestUser?.userid === userId) USER_CACHE.latestUser = updatedUser;
}
