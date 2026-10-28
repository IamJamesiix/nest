import { useState } from "react";
import { Icon } from "./ui";

// password field with an eye button to show or hide what you typed
export default function PasswordInput({ className = "", ...props }) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative">
      <input {...props} type={show ? "text" : "password"} className={`input pr-12 ${className}`} />
      <button
        type="button"
        onClick={() => setShow(!show)}
        onMouseDown={(e) => e.preventDefault()} // keep the cursor in the field
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        title={show ? "Hide password" : "Show password"}
        className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full text-mut transition-colors hover:bg-sf2 hover:text-ink"
      >
        <Icon name={show ? "eyeOff" : "eye"} size={18} />
      </button>
    </div>
  );
}
