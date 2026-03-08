import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppLayout } from "./components/AppLayout";
import Home from "./pages/Home";
import AnalysisPreview from "./pages/AnalysisPreview";
import VerifyEmail from "./pages/VerifyEmail";
import CompareReport from "./pages/CompareReport";
import Privacy from "./pages/Privacy";
import { lazy, Suspense } from "react";
// TODO: ScoringPlayground needs refactor to use new ScoredItem[] types — see todo.md
// const ScoringPlayground = lazy(() => import("./pages/debug/ScoringPlayground"));

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/verify-email"} component={VerifyEmail} />
      <Route path={"/analysis/preview"} component={AnalysisPreview} />
      <Route path={"/compare/:idA/:idB"} component={CompareReport} />
      <Route path={"/privacy"} component={Privacy} />
      {/* TODO: ScoringPlayground needs refactor to use new ScoredItem[] types — see todo.md */}
      {/* <Route path={"/debug/scoring"}>
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>}>
          <ScoringPlayground />
        </Suspense>
      </Route> */}      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AppLayout>
            <Router />
          </AppLayout>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
