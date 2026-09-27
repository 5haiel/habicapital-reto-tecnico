import { QueryClient, focusManager } from '@tanstack/react-query'

// TanStack Query's retry logic requires BOTH networkMode and window focus
// before it will retry or surface a failed query (see query-core's
// retryer.ts `canContinue`) — `networkMode: 'always'` below only covers
// half of that. In an embedded/automated browser context that never fires
// a real `focus` event, `document.hasFocus()` can stay false forever, so a
// failed query gets stuck in `fetchStatus: 'paused'` indefinitely instead
// of ever reaching `isError`. Telling the focus manager to always treat the
// window as focused sidesteps that class of host environment entirely,
// which is the officially documented escape hatch for this exact case.
focusManager.setFocused(true)

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: 1,
      // TanStack Query's default networkMode ('online') pauses queries
      // and retries whenever it believes the browser is offline, based on
      // `navigator.onLine` / online-offline events. That signal is
      // unreliable in some embedded/automated browser contexts — it can
      // report online but never actually resolve the pause, leaving a
      // query stuck in `pending` forever instead of surfacing the real
      // error. This is a local app talking to a local API with nothing
      // meaningful to gain from that pause, so we opt out of it.
      networkMode: 'always',
    },
    mutations: {
      networkMode: 'always',
    },
  },
})
