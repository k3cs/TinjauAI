import { useEffect, useState } from "react";

/**
 * The navbar is fixed and the page has one ink-filled band, so at some scroll positions ink type
 * sits on ink. Rather than give the bar its own opaque backdrop (which would cover the hero's
 * composition), it inverts while a dark band is behind it: every colour in the bar is expressed in
 * --ink / --paper, so flipping those two tokens flips the whole bar.
 */
export function useOverDark(navHeight = 72): boolean {
  const [over, setOver] = useState(false);

  useEffect(() => {
    const bands = [...document.querySelectorAll<HTMLElement>(".band-invert")];
    if (!bands.length) return;

    // Test the bar's centre line, not its whole box: a band merely touching the top edge is beside
    // the bar, not under it, and inverting then flashes the wrong palette over a light section.
    const check = () => {
      const mid = navHeight / 2;
      setOver(
        bands.some((b) => {
          const r = b.getBoundingClientRect();
          return r.top <= mid && r.bottom >= mid;
        }),
      );
    };

    check();
    window.addEventListener("scroll", check, { passive: true });
    window.addEventListener("resize", check);
    return () => {
      window.removeEventListener("scroll", check);
      window.removeEventListener("resize", check);
    };
  }, [navHeight]);

  return over;
}
