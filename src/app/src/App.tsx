import { useEffect } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createBrowserRouter,
  createRoutesFromElements,
  Navigate,
  Outlet,
  Route,
  RouterProvider,
  useLocation,
} from 'react-router-dom';
import PageShell from './components/PageShell';
import { TooltipProvider } from './components/ui/tooltip';
import { EvalHistoryProvider } from './contexts/EvalHistoryContext';
import { ToastProvider } from './contexts/ToastContext';
import { useTelemetry } from './hooks/useTelemetry';
import EvalPage from './pages/eval/page';
import EvalCreatorPage from './pages/eval-creator/page';
import EvalsIndexPage from './pages/evals/page';
import NotFoundPage from './pages/NotFoundPage';

const basename = import.meta.env.VITE_PUBLIC_BASENAME || '';

function TelemetryTracker() {
  const location = useLocation();
  const { recordEvent } = useTelemetry();

  useEffect(() => {
    recordEvent('webui_page_view', { path: location.pathname });
  }, [location.pathname, recordEvent]);

  return <Outlet />;
}

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route path="/" element={<PageShell />}>
        <Route element={<TelemetryTracker />}>
          <Route index element={<Navigate to="/setup" replace />} />
          <Route path="/eval" element={<EvalPage />} />
          <Route path="/evals" element={<EvalsIndexPage />} />
          <Route path="/eval/:evalId" element={<EvalPage />} />
          <Route path="/setup" element={<EvalCreatorPage />} />
          <Route path="/history" element={<Navigate to="/evals" replace />} />
          <Route path="/progress" element={<Navigate to="/evals" replace />} />
          <Route path="/datasets" element={<Navigate to="/setup" replace />} />
          <Route path="/prompts" element={<Navigate to="/setup" replace />} />
          <Route path="/media" element={<Navigate to="/eval" replace />} />
          <Route path="/model-audit" element={<Navigate to="/eval" replace />} />
          <Route path="/model-audits" element={<Navigate to="/evals" replace />} />
          <Route path="/model-audit/setup" element={<Navigate to="/setup" replace />} />
          <Route path="/model-audit/history" element={<Navigate to="/evals" replace />} />
          <Route path="/model-audit/:id" element={<Navigate to="/eval" replace />} />
          <Route path="/redteam" element={<Navigate to="/setup" replace />} />
          <Route path="/redteam/setup" element={<Navigate to="/setup" replace />} />
          <Route path="/report" element={<Navigate to="/eval" replace />} />
          <Route path="/reports" element={<Navigate to="/eval" replace />} />
          <Route path="/login" element={<Navigate to="/setup" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>,
  ),
  { basename },
);

const queryClient = new QueryClient();

function App() {
  return (
    <TooltipProvider delayDuration={300} skipDelayDuration={0}>
      <ToastProvider>
        <EvalHistoryProvider>
          <QueryClientProvider client={queryClient}>
            <RouterProvider router={router} />
          </QueryClientProvider>
        </EvalHistoryProvider>
      </ToastProvider>
    </TooltipProvider>
  );
}

export default App;
