import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Calendar } from "./components/Calendar";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Sidebar, Page } from "./components/Sidebar";
import { GuestsView } from "./components/GuestsView";
import { LiveCallView } from "./components/LiveCallView";
import { RequestsPage } from "./components/RequestsPage";

export default function App() {
  const [page, setPage] = useState<Page>("calendar");
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="size-full bg-white flex overflow-hidden">
      <Sidebar
        page={page}
        setPage={setPage}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18 }}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <ErrorBoundary>
            {page === "calendar" && (
              <div className="flex-1 overflow-hidden px-10 py-8">
                <Calendar />
              </div>
            )}
            {page === "guests" && <GuestsView />}
            {page === "live" && <LiveCallView />}
            {page === "requests" && <RequestsPage />}
          </ErrorBoundary>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
