import { useTheme } from "../context/ThemeContext";
import { Icon } from "./ui";

// round sun / moon button. "onDark" is for the dark dashboard sidebar
export default function ThemeToggle({ onDark = false, className = "" }) {
  const { dark, toggle } = useTheme();
  const look = onDark ? "border-white/10 text-onteal/80 hover:bg-white/5" : "border-line bg-sf text-ink hover:bg-sf2";
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Light mode" : "Dark mode"}
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-colors ${look} ${className}`}
    >
      <Icon name={dark ? "sun" : "moon"} />
    </button>
  );
}
