import { useEffect, useState } from "react";
import api from "../api/client";
import { AMENITIES, amenityLabel } from "./format";

// fetched once, then shared by every page that needs it
let cache = null;
const fallback = AMENITIES.map((key) => ({ key, label: amenityLabel(key) }));

// the standard amenity list: [{ key, label, count }]
export default function useAmenities() {
  const [list, setList] = useState(cache || fallback);

  useEffect(() => {
    if (cache) return;
    api
      .get("/listings/amenities")
      .then((res) => {
        if (res.data.amenities?.length) {
          cache = res.data.amenities;
          setList(cache);
        }
      })
      .catch(() => {}); // keep the fallback list
  }, []);

  return list;
}

// label for a key, using the API's wording when we have it
export const labelFrom = (list, key) => list.find((a) => a.key === key)?.label || amenityLabel(key);
