import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { RouterProvider } from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './lib/auth.js';
import { queryClient } from './lib/queryClient.js';
import { router } from './router.js';
import { Splash } from './components/splash.js';
import './styles.css';

function RouterShell() {
  const auth = useAuth();

  // `beforeLoad` reads `context.auth` once per navigation. When the session
  // changes (sign-in, sign-out, refresh), we invalidate the router so guards
  // re-evaluate with the fresh state.
  useEffect(() => {
    if (auth.session === undefined) return;
    void router.invalidate();
  }, [auth.session]);

  if (auth.session === undefined) {
    return <Splash />;
  }

  return <RouterProvider router={router} context={{ auth, queryClient }} />;
}

const rootEl = document.getElementById('root');
if (!rootEl) {
  throw new Error('Root element #root not found');
}

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterShell />
        <Toaster position="top-center" richColors closeButton />
      </AuthProvider>
      {import.meta.env.DEV ? (
        <>
          <ReactQueryDevtools initialIsOpen={false} />
          <TanStackRouterDevtools router={router} />
        </>
      ) : null}
    </QueryClientProvider>
  </StrictMode>,
);
