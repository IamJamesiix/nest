import { createContext, useContext, useEffect, useState } from "react";

const CompareContext = createContext(null);
const MAX = 4;

// keeps the houses a user ticked for comparison (2 to 4), saved across reloads
export function CompareProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("nest_compare")) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("nest_compare", JSON.stringify(items));
  }, [items]);

  const has = (id) => items.some((i) => i._id === id);

  // returns false if the list is already full
  const toggle = (listing) => {
    if (has(listing._id)) {
      setItems((list) => list.filter((i) => i._id !== listing._id));
      return true;
    }
    if (items.length >= MAX) return false;
    setItems((list) => [...list, { _id: listing._id, title: listing.title, photo: listing.photos?.[0] }]);
    return true;
  };

  const remove = (id) => setItems((list) => list.filter((i) => i._id !== id));
  const clear = () => setItems([]);

  return (
    <CompareContext.Provider value={{ items, has, toggle, remove, clear, max: MAX }}>{children}</CompareContext.Provider>
  );
}

export const useCompare = () => useContext(CompareContext);
