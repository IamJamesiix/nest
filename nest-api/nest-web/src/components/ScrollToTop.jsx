import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// jump to the top when the page changes
export default function ScrollToTop() {
  const { pathname } = useLocation();
  // braces matter: an effect must return nothing or a cleanup function.
  // some browser extensions make scrollTo return a value, which React would then try to call
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
