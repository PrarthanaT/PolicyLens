import { Link, useLocation } from "react-router-dom";

const navItems = [
  { path: "/", icon: "search", label: "Drug Lookup" },
  { path: "/comparison", icon: "compare_arrows", label: "Comparison View" },
  { path: "/heatmap", icon: "local_fire_department", label: "PA Friction Heatmap" },
  { path: "/ask-ai", icon: "psychology", label: "Ask AI" },
  { path: "/changes", icon: "history_edu", label: "Policy Changes" },
  { path: "/ingest", icon: "upload_file", label: "Ingest Policies" },
  { path: "/library", icon: "library_books", label: "Policy Library" },
];

export default function SideNavBar() {
  const location = useLocation();

  return (
    <aside className="h-screen w-64 fixed left-0 top-0 bg-[#F2F4F6] flex flex-col p-4 space-y-2 z-50">
      <div className="mb-8 px-4 py-2">
        <div className="flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-[#0EA5A0] text-2xl font-bold">
            analytics
          </span>
          <h1 className="text-xl font-black text-[#0EA5A0] tracking-tight font-headline">
            Policy Lens
          </h1>
        </div>
        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">
          Clinical Analytics
        </p>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ease-out font-medium text-sm ${
                isActive
                  ? "bg-white text-[#0EA5A0] shadow-sm font-semibold"
                  : "text-slate-600 hover:text-[#0EA5A0] hover:bg-white/50 group"
              }`}
            >
              <span
                className="material-symbols-outlined text-[20px]"
                style={{
                  fontVariationSettings: isActive ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="pt-4 border-t border-slate-200/50 space-y-1">
        <a
          className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-[#0EA5A0] hover:bg-white/50 transition-all duration-200 ease-out rounded-lg font-medium text-sm"
          href="#"
        >
          <span className="material-symbols-outlined text-[20px]">
            settings
          </span>
          <span>Settings</span>
        </a>
        <a
          className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-[#0EA5A0] hover:bg-white/50 transition-all duration-200 ease-out rounded-lg font-medium text-sm"
          href="#"
        >
          <span className="material-symbols-outlined text-[20px]">
            contact_support
          </span>
          <span>Support</span>
        </a>
      </div>
    </aside>
  );
}
