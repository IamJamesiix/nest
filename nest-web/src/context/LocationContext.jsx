import { createContext, useCallback, useContext, useState } from "react";
import { CAMPUS } from "../utils/format";

const LocationContext = createContext(null);

// the student's location, kept in memory only (never saved).
// status: "idle" | "locating" | "located" | "denied" | "unavailable"
// source: "gps" | "pin" | "campus"
export function LocationProvider({ children }) {
  const [loc, setLoc] = useState(null); // { lat, lng, accuracy, source }
  const [status, setStatus] = useState("idle");

  const locate = useCallback(() => {
    if (!navigator.geolocation) {
      setStatus("unavailable");
      setLoc({ ...CAMPUS, source: "campus" });
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setLoc({ lat: latitude, lng: longitude, accuracy: Math.round(accuracy), source: "gps" });
        setStatus("located");
      },
      (err) => {
        setStatus(err.code === 1 ? "denied" : "unavailable");
        setLoc({ ...CAMPUS, source: "campus" });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, []);

  // the user dropped a pin on the map instead
  const setPin = useCallback((lat, lng) => {
    setLoc({ lat, lng, source: "pin" });
    setStatus("located");
  }, []);

  const useCampus = useCallback(() => {
    setLoc({ ...CAMPUS, source: "campus" });
    setStatus("idle");
  }, []);

  return <LocationContext.Provider value={{ loc, status, locate, setPin, useCampus }}>{children}</LocationContext.Provider>;
}

export const useUserLocation = () => useContext(LocationContext);
