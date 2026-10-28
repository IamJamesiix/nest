import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./ui";

// a dropdown that matches the Nest look in light and dark mode, instead of the browser's own.
// options: [{ value, label }] or plain strings.
// variant: "input" (bordered field), "bare" (inside the home search bar), "pill" (small, for tables),
//          "onDark" (on teal panels like the cost breakdown)
export default function Select({ value, onChange, options, variant = "input", label, id, className = "", placeholder = "Select" }) {
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);
  const wrap = useRef(null);
  const list = useRef(null);
  const typed = useRef({ text: "", at: 0 });
  const autoId = useId();
  const listId = `${id || autoId}-list`;

  const selected = opts.find((o) => String(o.value) === String(value));
  const selectedIndex = Math.max(0, opts.indexOf(selected));

  // close when clicking anywhere else
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !wrap.current?.contains(e.target) && !list.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // keep the highlighted option in view
  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  // the list floats above the page (so tables and pop-ups can't clip it),
  // lined up under the button, or above it if there isn't room below
  const place = () => {
    const box = wrap.current?.getBoundingClientRect();
    if (!box) return;
    const below = window.innerHeight - box.bottom;
    const upward = below < 280 && box.top > below;
    const pad = variant === "bare" ? 8 : 0;
    setPos({
      left: Math.max(8, box.left - pad),
      minWidth: box.width + pad * 2,
      maxWidth: `min(20rem, calc(100vw - ${Math.max(8, box.left - pad) + 8}px))`,
      ...(upward ? { bottom: window.innerHeight - box.top + 8 } : { top: box.bottom + 8 }),
      upward,
    });
  };

  const openList = () => {
    place();
    setActive(selectedIndex);
    setOpen(true);
  };

  // follow the button if the page scrolls or resizes while open
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  const choose = (o) => {
    onChange(o.value);
    setOpen(false);
    wrap.current?.querySelector("button")?.focus();
  };

  const onKey = (e) => {
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      return openList();
    }
    if (!open) return;
    if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(opts.length - 1, a + 1)));
    else if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(0, a - 1)));
    else if (e.key === "Home") (e.preventDefault(), setActive(0));
    else if (e.key === "End") (e.preventDefault(), setActive(opts.length - 1));
    else if (e.key === "Enter" || e.key === " ") (e.preventDefault(), choose(opts[active]));
    else if (e.key === "Escape" || e.key === "Tab") setOpen(false);
    else if (e.key.length === 1) {
      // type a letter to jump, like a normal select
      const now = Date.now();
      typed.current.text = now - typed.current.at > 700 ? e.key.toLowerCase() : typed.current.text + e.key.toLowerCase();
      typed.current.at = now;
      const hit = opts.findIndex((o) => String(o.label).toLowerCase().startsWith(typed.current.text));
      if (hit >= 0) setActive(hit);
    }
  };

  const trigger = {
    input: "input flex items-center justify-between gap-2 text-left",
    bare: "flex w-full items-center justify-between gap-2 bg-transparent text-left text-[15px] font-semibold text-ink outline-none",
    pill: "flex h-9 items-center justify-between gap-2 rounded-full border border-line bg-sf px-3.5 text-left text-sm font-semibold hover:bg-sf2",
    onDark: "flex items-center justify-between gap-2 rounded-full bg-white/10 px-3 py-1.5 text-left text-sm font-bold text-onteal hover:bg-white/15",
  }[variant];

  return (
    <div ref={wrap} className={`relative ${variant === "bare" || variant === "input" ? "w-full" : ""} ${className}`}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={label}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onKey}
        className={`${trigger} w-full min-w-0`}
      >
        {/* the text shrinks with an ellipsis so the arrow always has its own space */}
        <span className={`min-w-0 flex-1 truncate ${selected ? "" : "text-mut"}`}>{selected ? selected.label : placeholder}</span>
        <Icon name="chevron" size={variant === "pill" ? 15 : 17} className={`shrink-0 opacity-70 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open &&
        pos &&
        createPortal(
          <ul
            ref={list}
            id={listId}
            role="listbox"
            aria-activedescendant={`${listId}-${active}`}
            style={{ position: "fixed", left: pos.left, top: pos.top, bottom: pos.bottom, minWidth: pos.minWidth, maxWidth: pos.maxWidth }}
            className={`dropdown z-[60] max-h-72 overflow-y-auto rounded-2xl border border-line bg-sf p-1.5 shadow-soft ${pos.upward ? "origin-bottom" : "origin-top"}`}
          >
            {opts.map((o, i) => {
              const isSel = o === selected;
              return (
                <li
                  key={String(o.value)}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={isSel}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(o)}
                  className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors ${
                    i === active ? "bg-sf2" : ""
                  } ${isSel ? "font-bold text-tealt" : "font-medium text-ink"}`}
                >
                  <span className="truncate">{o.label}</span>
                  {isSel && <Icon name="check" size={16} className="shrink-0" />}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
}
