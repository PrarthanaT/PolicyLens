import { BrowserRouter, Routes, Route } from "react-router-dom";
import SideNavBar from "./components/layout/SideNavBar";
import TopAppBar from "./components/layout/TopAppBar";
import FloatingAIButton from "./components/layout/FloatingAIButton";
import DrugLookupPage from "./pages/DrugLookupPage";
import ComparisonPage from "./pages/ComparisonPage";
import AskAIPage from "./pages/AskAIPage";
import PolicyChangesPage from "./pages/PolicyChangesPage";
import IngestPage from "./pages/IngestPage";
import LibraryPage from "./pages/LibraryPage";
import PAFrictionHeatmapPage from "./pages/PAFrictionHeatmapPage";

function AppLayout({
  children,
  title,
  showSearch = true,
}: {
  children: React.ReactNode;
  title?: string;
  showSearch?: boolean;
}) {
  return (
    <>
      <TopAppBar title={title} showSearch={showSearch} />
      {children}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <SideNavBar />
        <main className="flex-1 ml-64 flex flex-col min-w-0">
          <Routes>
            <Route
              path="/"
              element={
                <AppLayout showSearch>
                  <DrugLookupPage />
                </AppLayout>
              }
            />
            <Route
              path="/comparison"
              element={
                <AppLayout showSearch>
                  <ComparisonPage />
                </AppLayout>
              }
            />
            <Route
              path="/heatmap"
              element={
                <AppLayout title="PA Friction Heatmap" showSearch={false}>
                  <PAFrictionHeatmapPage />
                </AppLayout>
              }
            />
            <Route
              path="/ask-ai"
              element={
                <AppLayout title="Ask AI" showSearch={false}>
                  <AskAIPage />
                </AppLayout>
              }
            />
            <Route
              path="/changes"
              element={
                <AppLayout showSearch>
                  <PolicyChangesPage />
                </AppLayout>
              }
            />
            <Route
              path="/ingest"
              element={
                <AppLayout title="Policy Ingestion Engine" showSearch={false}>
                  <IngestPage />
                </AppLayout>
              }
            />
            <Route
              path="/library"
              element={
                <AppLayout showSearch>
                  <LibraryPage />
                </AppLayout>
              }
            />
          </Routes>
        </main>
        <FloatingAIButton />
      </div>
    </BrowserRouter>
  );
}
