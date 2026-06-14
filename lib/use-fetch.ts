"use client";

import { useEffect, useState } from "react";

export interface FetchState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/** Minimal JSON GET hook with loading/error states. */
export function useJson<T>(url: string): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: null });
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => active && setState({ data, loading: false, error: null }))
      .catch(
        (e) =>
          active &&
          setState({ data: null, loading: false, error: String(e) }),
      );
    return () => {
      active = false;
    };
  }, [url]);

  return state;
}
