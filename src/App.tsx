import { Suspense, lazy, useState } from "react";
import { Navigate, Outlet, Route, Routes, useSearchParams } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { Today } from "./pages/Today";
import { useAppState } from "./lib/store/context";
import { useI18n } from "./i18n/context";

// Today is the usual landing screen; everything else loads on demand.
const Welcome = lazy(() => import("./pages/Welcome").then((m) => ({ default: m.Welcome })));
const Tasks = lazy(() => import("./pages/Tasks").then((m) => ({ default: m.Tasks })));
const Habits = lazy(() => import("./pages/Habits").then((m) => ({ default: m.Habits })));
const Focus = lazy(() => import("./pages/Focus").then((m) => ({ default: m.Focus })));
const Insights = lazy(() => import("./pages/Insights").then((m) => ({ default: m.Insights })));
const Settings = lazy(() => import("./pages/Settings").then((m) => ({ default: m.Settings })));
const NotFound = lazy(() => import("./pages/NotFound").then((m) => ({ default: m.NotFound })));

function Spinner() {
  const { m } = useI18n();
  return (
    <div className="flex min-h-[50vh] items-center justify-center" role="status" aria-label={m.common.loading}>
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-brand-500" />
    </div>
  );
}

/**
 * First visit (nothing saved yet, quiz not done or skipped) goes to the
 * welcome quiz; everyone else gets the app.
 */
function AppGate() {
  const { settings, tasks, habits, projects, sessions } = useAppState();
  const firstVisit = !settings.onboarded && tasks.length + habits.length + projects.length + sessions.length === 0;
  if (firstVisit) return <Navigate to="/welcome" replace />;
  return (
    <AppShell>
      <Suspense fallback={<Spinner />}>
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

/**
 * The quiz runs once. After it is finished (or skipped) it only opens again
 * when the user explicitly retakes it from Settings (?retake=1).
 */
function WelcomeRoute() {
  const { settings } = useAppState();
  const [params] = useSearchParams();
  // Decided once, on arrival — finishing the quiz must not trigger this
  // redirect and override the navigation to the chosen style's start page.
  const [doneOnArrival] = useState(() => settings.onboarded);
  if (doneOnArrival && params.get("retake") !== "1") return <Navigate to="/" replace />;
  return <Welcome />;
}

export function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <Routes>
        <Route path="/welcome" element={<WelcomeRoute />} />
        <Route element={<AppGate />}>
          <Route path="/" element={<Today />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/focus" element={<Focus />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
