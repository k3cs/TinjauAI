import { useCallback, useEffect, useState } from "react";

export type Theme = "dark" | "light";
const KEY = "tinjau-theme";

function read(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "dark" ? "dark" : "light";
}

/** Light is the committed default (index.html applies it before first paint); the toggle persists. */
export function useTheme(): { theme: Theme; toggle: () => void } {
  const [theme, setTheme] = useState<Theme>(read);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* private mode: the choice lives for this tab only */
    }
  }, [theme]);

  const toggle = useCallback(() => {
    const html = document.documentElement;
    html.classList.add("theme-anim");
    window.setTimeout(() => html.classList.remove("theme-anim"), 320);
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  return { theme, toggle };
}
