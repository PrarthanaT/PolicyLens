interface TopAppBarProps {
  title?: string;
  showSearch?: boolean;
}

export default function TopAppBar({
  title,
  showSearch = true,
}: TopAppBarProps) {
  return (
    <header className="h-16 bg-[#F7F8FA] flex items-center justify-between px-8 w-full sticky top-0 z-40">
      <div className="flex items-center gap-4 flex-1">
        {showSearch ? (
          <div className="relative w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">
              search
            </span>
            <input
              className="w-full bg-[#F2F4F6] border-none rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-[#0EA5A0] transition-all"
              placeholder="Search..."
              type="text"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-sm">Workspace</span>
            <span className="material-symbols-outlined text-slate-300 text-sm">
              chevron_right
            </span>
            <span className="text-sm font-semibold text-on-surface">
              {title}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <button className="text-slate-500 hover:bg-[#F2F4F6] p-2 rounded-lg transition-colors relative">
          <span className="material-symbols-outlined text-[22px]">
            notifications
          </span>
          <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full border-2 border-white" />
        </button>
        <button className="text-slate-500 hover:bg-[#F2F4F6] p-2 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-[22px]">
            help_outline
          </span>
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right">
            <p className="text-xs font-bold text-on-surface">Sarah Jenkins</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">
              Senior Clinical Analyst
            </p>
          </div>
          <img
            alt="Analyst Profile"
            className="w-8 h-8 rounded-full border border-slate-200 object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDmpOLGtrGMyek7tVGSsmlLW35Nf5Dh1VKK1kpv5I6mdjQt97xjhBedGD1ULqzw5tAZKWYKDyh2d2NztbO4YuOOGm0IDWOFYIcFrF8GK6BOx79cHlOXkq0HL1K0sa-KwIY6vnTBh3gINLcNCfB_Iu83KbLy5PD3haNhcARtaDdYtZ4kqoKYy5Wa_EVrKVb4KvlDlYH-opdLhGfhK_Nz5n0iY5JgE8Nw0SBAMeC4QN5iwz-Ebxd0ELzq4HuKfzG57p_VBe-q0B6-KZg"
          />
        </div>
      </div>
    </header>
  );
}
