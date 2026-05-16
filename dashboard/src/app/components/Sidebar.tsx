import { motion, AnimatePresence } from "motion/react";
import { CalendarDays, Users, Phone, PanelLeftClose, PanelLeftOpen } from "lucide-react";

export type Page = "calendar" | "guests" | "live";

const NAV = [
  { id: "calendar" as Page, label: "Calendar",  icon: CalendarDays },
  { id: "guests"   as Page, label: "Guests",    icon: Users },
  { id: "live"     as Page, label: "Live Call",  icon: Phone },
];

interface SidebarProps {
  page: Page;
  setPage: (p: Page) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export function Sidebar({ page, setPage, collapsed, setCollapsed }: SidebarProps) {
  return (
    <motion.div
      animate={{ width: collapsed ? 52 : 200 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex flex-col border-r border-[#E8E4DA] bg-white flex-shrink-0 overflow-hidden"
    >
      {/* Brand + toggle */}
      <div className="flex items-center justify-between border-b border-[#E8E4DA] flex-shrink-0"
        style={{ height: 56, paddingLeft: collapsed ? 0 : 20, paddingRight: 8 }}>
        <AnimatePresence>
          {!collapsed && (
            <motion.h1
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: "1.375rem", fontWeight: 300, color: "#1A1814", letterSpacing: "-0.01em", lineHeight: 1, whiteSpace: "nowrap" }}
            >
              Forecourt
            </motion.h1>
          )}
        </AnimatePresence>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#F2F0EB] transition-colors flex-shrink-0"
          style={{ marginLeft: collapsed ? "auto" : 0, marginRight: collapsed ? "auto" : 0 }}
        >
          {collapsed
            ? <PanelLeftOpen  className="w-4 h-4" style={{ color: "#AAA", strokeWidth: 1.5 }} />
            : <PanelLeftClose className="w-4 h-4" style={{ color: "#AAA", strokeWidth: 1.5 }} />
          }
        </button>
      </div>

      {/* Nav */}
      <nav className="pt-3 flex flex-col gap-0.5 px-2">
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = page === id;
          return (
            <button
              key={id}
              onClick={() => setPage(id)}
              title={collapsed ? label : undefined}
              className="flex items-center gap-3 py-2.5 rounded transition-colors text-left w-full relative"
              style={{
                background: active ? "#F2F0EB" : "transparent",
                paddingLeft: collapsed ? 0 : 10,
                paddingRight: collapsed ? 0 : 10,
                justifyContent: collapsed ? "center" : "flex-start",
              }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? "#1A1814" : "#BBB", strokeWidth: 1.5 }} />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{ fontFamily: "General Sans, sans-serif", fontSize: "0.8125rem", color: active ? "#1A1814" : "#999", letterSpacing: "0.01em", whiteSpace: "nowrap", overflow: "hidden" }}
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          );
        })}
      </nav>
    </motion.div>
  );
}
