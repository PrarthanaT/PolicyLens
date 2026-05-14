import { Link, useLocation } from "react-router-dom";

export default function FloatingAIButton() {
  const location = useLocation();

  if (location.pathname === "/ask-ai") return null;

  return (
    <Link
      to="/ask-ai"
      className="fixed bottom-8 right-8 w-14 h-14 bg-[#0EA5A0] text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform z-50"
    >
      <span
        className="material-symbols-outlined text-[28px]"
        style={{ fontVariationSettings: "'FILL' 1" }}
      >
        psychology
      </span>
    </Link>
  );
}
