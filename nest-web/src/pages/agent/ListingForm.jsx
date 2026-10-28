import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { errMsg } from "../../api/client";
import { PinPicker } from "../../components/MapView";
import Select from "../../components/Select";
import { ErrorNote, Icon, PageTitle, Photo, Spinner } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { CAMPUS, ELECTRICITY, fmtKm, kmBetween, MEDIA, naira, RENT_PERIODS, ROOM_TYPES } from "../../utils/format";
import useAmenities, { labelFrom } from "../../utils/useAmenities";
import { VerificationBanner } from "./AgentDashboard";

const BLANK = {
  title: "",
  description: "",
  area: "",
  landmark: "",
  address: "",
  lat: null,
  lng: null,
  roomType: "self_contained",
  bedrooms: 1,
  bathrooms: 1,
  isShared: false,
  spacesForRoommates: 0,
  electricity24: null, // must be answered: true or false
  amenities: [],
  rent: "",
  rentPeriod: "yearly",
  agencyFee: "",
  legalFee: "",
  cautionFee: "",
  serviceCharge: "",
  otherFees: [],
  photos: [],
  videos: [],
};

const num = (v) => Number(String(v).replace(/\D/g, "")) || 0;
const mb = (bytes) => (bytes / 1024 / 1024).toFixed(1);

function Field({ label, id, children, hint }) {
  return (
    <div>
      <label className="label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-mut">{hint}</p>}
    </div>
  );
}

// area name for a pin, from OpenStreetMap
const reverseGeocode = async (lat, lng) => {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return "";
  const data = await res.json();
  const a = data.address || {};
  return a.suburb || a.neighbourhood || a.village || a.town || "";
};

export default function ListingForm() {
  const { id } = useParams();
  const editing = !!id;
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const amenityList = useAmenities().filter((a) => a.key !== ELECTRICITY); // the yes/no question controls this one
  const [form, setForm] = useState(BLANK);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customAmenity, setCustomAmenity] = useState("");
  const [newPhotos, setNewPhotos] = useState([]);
  const [newVideos, setNewVideos] = useState([]);
  const [fileErrors, setFileErrors] = useState([]);
  const [progress, setProgress] = useState(null);
  const [gps, setGps] = useState({ status: "idle", accuracy: null });
  const [areaTouched, setAreaTouched] = useState(false);
  const geoTimer = useRef(null);
  const lightRef = useRef(null);
  const pinRef = useRef(null);

  useEffect(() => {
    if (!editing) return;
    api
      .get(`/listings/${id}`)
      .then(({ data }) => {
        const l = data.listing;
        setForm({
          ...BLANK,
          ...l,
          area: l.area || "",
          landmark: l.landmark || "",
          address: l.address || "",
          amenities: (l.amenities || []).filter((a) => a !== ELECTRICITY),
          electricity24: l.electricity24 ?? (l.amenities?.includes(ELECTRICITY) ? true : null),
          otherFees: l.otherFees || [],
          videos: l.videos || [],
        });
        setAreaTouched(!!l.area);
      })
      .catch((err) => setError(errMsg(err)))
      .finally(() => setLoading(false));
  }, [id]);

  // object urls for previews, cleaned up when files change
  const [previews, setPreviews] = useState({ photos: [], videos: [] });
  useEffect(() => {
    const p = { photos: newPhotos.map((f) => URL.createObjectURL(f)), videos: newVideos.map((f) => URL.createObjectURL(f)) };
    setPreviews(p);
    return () => [...p.photos, ...p.videos].forEach((u) => URL.revokeObjectURL(u));
  }, [newPhotos, newVideos]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const setMoney = (key) => (e) => setForm({ ...form, [key]: e.target.value.replace(/\D/g, "") });

  // ---------- location ----------
  const setPin = (lat, lng) => {
    setForm((f) => ({ ...f, lat, lng }));
    setError((e) => (e.startsWith("Pin the house") ? "" : e));
    // fill the area name from the map, once the pin settles, unless the agent typed one
    clearTimeout(geoTimer.current);
    if (areaTouched) return;
    geoTimer.current = setTimeout(async () => {
      try {
        const name = await reverseGeocode(lat, lng);
        if (name) setForm((f) => (f.lat === lat && f.lng === lng ? { ...f, area: name } : f));
      } catch {
        // offline or blocked: the agent can type the area
      }
    }, 900);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return setGps({ status: "error", accuracy: null, message: "This browser can't share location. Drop the pin on the map instead." });
    setGps({ status: "locating", accuracy: null });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        setPin(latitude, longitude);
        setGps({ status: "done", accuracy: Math.round(accuracy) });
      },
      (err) =>
        setGps({
          status: "error",
          accuracy: null,
          message: err.code === 1 ? "Location is blocked. Allow it in your browser, or drop the pin on the map." : "Couldn't get a GPS fix. Try again outdoors, or drop the pin on the map.",
        }),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // ---------- amenities ----------
  const toggleAmenity = (a) =>
    setForm({ ...form, amenities: form.amenities.includes(a) ? form.amenities.filter((x) => x !== a) : [...form.amenities, a] });

  const addCustomAmenity = () => {
    const a = customAmenity.trim().toLowerCase();
    if (a && !form.amenities.includes(a)) setForm({ ...form, amenities: [...form.amenities, a] });
    setCustomAmenity("");
  };

  const setFee = (i, key, value) => {
    const fees = [...form.otherFees];
    fees[i] = { ...fees[i], [key]: key === "amount" ? value.replace(/\D/g, "") : value };
    setForm({ ...form, otherFees: fees });
  };

  // ---------- media ----------
  // check type, size and count before anything is uploaded
  const pickFiles = (kind, fileList) => {
    const rule = MEDIA[kind];
    const have = kind === "photo" ? form.photos.length + newPhotos.length : form.videos.length + newVideos.length;
    const ok = [];
    const problems = [];
    for (const f of fileList) {
      if (!rule.types.includes(f.type)) problems.push(`${f.name}: use ${rule.label}`);
      else if (f.size > rule.maxMb * 1024 * 1024) problems.push(`${f.name} is ${mb(f.size)} MB. The limit is ${rule.maxMb} MB.`);
      else if (have + ok.length >= rule.max) problems.push(`${f.name}: you can have up to ${rule.max} ${kind}s per listing`);
      else ok.push(f);
    }
    setFileErrors(problems);
    if (kind === "photo") setNewPhotos((list) => [...list, ...ok]);
    else setNewVideos((list) => [...list, ...ok]);
  };

  const removeSaved = async (url, kind) => {
    if (!window.confirm(`Remove this ${kind} from the listing?`)) return;
    try {
      const res = await api.delete(`/listings/${id}/media`, { data: { url } });
      setForm((f) => ({ ...f, photos: res.data.photos ?? f.photos.filter((x) => x !== url), videos: res.data.videos ?? f.videos.filter((x) => x !== url) }));
      toast(`${kind === "photo" ? "Photo" : "Video"} removed`);
    } catch (err) {
      toast(errMsg(err), "error");
    }
  };

  const uploadMedia = async (listingId) => {
    if (!newPhotos.length && !newVideos.length) return;
    const fd = new FormData();
    newPhotos.forEach((f) => fd.append("photos", f));
    newVideos.forEach((f) => fd.append("videos", f));
    setProgress(0);
    await api.post(`/listings/${listingId}/media`, fd, {
      onUploadProgress: (e) => e.total && setProgress(Math.round((e.loaded / e.total) * 100)),
    });
  };

  // ---------- cost preview ----------
  const preview = [
    ["Rent", num(form.rent)],
    ["Agency fee", num(form.agencyFee)],
    ["Legal fee", num(form.legalFee)],
    ["Caution fee", num(form.cautionFee)],
    ["Service charge", num(form.serviceCharge)],
    ...form.otherFees.filter((f) => f.name).map((f) => [f.name, num(f.amount)]),
  ].filter(([, v]) => v > 0);
  const total = preview.reduce((s, [, v]) => s + v, 0);

  // ---------- save ----------
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.title.trim() || num(form.rent) <= 0) {
      setError("Add a title and the rent.");
      return window.scrollTo({ top: 0, behavior: "smooth" });
    }
    if (form.electricity24 === null) {
      setError("Answer the 24hrs electricity question before saving.");
      return lightRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (form.lat == null || form.lng == null) {
      setError("Pin the house on the map before saving.");
      return pinRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    setSaving(true);
    let listingId = id;
    try {
      const body = {
        title: form.title,
        description: form.description,
        area: form.area.trim(),
        landmark: form.landmark.trim(),
        address: form.address.trim(),
        lat: form.lat,
        lng: form.lng,
        roomType: form.roomType,
        bedrooms: Number(form.bedrooms) || 1,
        bathrooms: Number(form.bathrooms) || 1,
        isShared: form.isShared,
        spacesForRoommates: form.isShared ? Number(form.spacesForRoommates) || 1 : 0,
        electricity24: form.electricity24,
        amenities: form.amenities.filter((a) => a !== ELECTRICITY),
        rent: num(form.rent),
        rentPeriod: form.rentPeriod,
        agencyFee: num(form.agencyFee),
        legalFee: num(form.legalFee),
        cautionFee: num(form.cautionFee),
        serviceCharge: num(form.serviceCharge),
        otherFees: form.otherFees.filter((f) => f.name).map((f) => ({ name: f.name, amount: num(f.amount) })),
      };

      // the listing is created first, then its photos and videos go up
      const res = editing ? await api.patch(`/listings/${id}`, body) : await api.post("/listings", body);
      listingId = res.data.listing._id;
    } catch (err) {
      setSaving(false);
      return setError(errMsg(err));
    }

    try {
      await uploadMedia(listingId);
      toast(editing ? "Listing updated" : "Listing published");
      navigate("/agent");
    } catch (err) {
      // the listing is saved; send the agent to edit it so they can retry the upload
      toast(`Listing saved, but the upload failed: ${errMsg(err)}`, "error");
      if (!editing) navigate(`/agent/listings/${listingId}/edit`, { replace: true });
      else setError(errMsg(err));
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  if (loading) return <Spinner label="Loading listing" />;

  if (!editing && user.agentInfo?.verificationStatus !== "approved") {
    return (
      <>
        <PageTitle title="Create a listing" />
        <VerificationBanner info={user.agentInfo} />
      </>
    );
  }

  const pin = form.lat != null && form.lng != null ? { lat: form.lat, lng: form.lng } : null;
  const roughGps = gps.status === "done" && gps.accuracy > 50;
  const photoCount = form.photos.length + newPhotos.length;
  const videoCount = form.videos.length + newVideos.length;

  return (
    <>
      <PageTitle
        title={editing ? "Edit listing" : "Create a listing"}
        text="Students see the total cost you enter here, so include every fee."
        action={
          <Link to="/agent" className="btn btn-ghost">
            Cancel
          </Link>
        }
      />

      <form onSubmit={submit} noValidate className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* ---------- the house ---------- */}
          <section className="panel space-y-4 p-6">
            <h2 className="text-lg font-bold">The house</h2>
            <Field label="Listing title" id="title">
              <input id="title" required className="input" value={form.title} onChange={set("title")} placeholder="e.g. Tiled self-con behind the filling station" />
            </Field>
            <Field label="Description" id="desc">
              <textarea id="desc" rows={4} className="input" value={form.description} onChange={set("description")} placeholder="Water, light, the compound, the street..." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Room type" id="roomType">
                <Select
                  id="roomType"
                  value={form.roomType}
                  onChange={(v) => setForm({ ...form, roomType: v })}
                  options={Object.entries(ROOM_TYPES).map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label="Bedrooms" id="bed">
                <input id="bed" type="number" min="1" className="input" value={form.bedrooms} onChange={set("bedrooms")} />
              </Field>
              <Field label="Bathrooms" id="bath">
                <input id="bath" type="number" min="0" className="input" value={form.bathrooms} onChange={set("bathrooms")} />
              </Field>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" className="h-4 w-4 accent-teal" checked={form.isShared} onChange={set("isShared")} />
                Students can share this house
              </label>
              {form.isShared && (
                <label className="flex items-center gap-2 text-sm text-mut">
                  Spaces for roommates
                  <input type="number" min="1" className="input h-9 w-20" value={form.spacesForRoommates} onChange={set("spacesForRoommates")} />
                </label>
              )}
            </div>
          </section>

          {/* ---------- location ---------- */}
          <section ref={pinRef} className={`panel space-y-4 p-6 ${error && !pin ? "ring-2 ring-bad/40" : ""}`}>
            <div>
              <h2 className="text-lg font-bold">Where is the house? *</h2>
              <p className="mt-1 text-sm text-mut">Students search by distance, so the pin must be on the exact house.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button type="button" onClick={useMyLocation} disabled={gps.status === "locating"} className="btn btn-teal">
                <Icon name="pin" />
                {gps.status === "locating" ? "Getting your location…" : "I'm at the house: use my current location"}
              </button>
              {gps.status === "done" && (
                <span className={`text-sm font-semibold ${roughGps ? "text-pdt" : "text-okt"}`}>Located within {fmtKm(gps.accuracy / 1000)}</span>
              )}
            </div>
            {roughGps && (
              <p className="rounded-2xl bg-pdb px-4 py-3 text-sm text-pdt">
                That's not very precise. Wait a few seconds outdoors and try again, or drag the pin onto the house.
              </p>
            )}
            {gps.status === "error" && <p className="rounded-2xl bg-pdb px-4 py-3 text-sm text-pdt">{gps.message}</p>}

            <PinPicker value={pin} onChange={setPin} className="h-72" />
            <p className="text-xs text-mut">
              {pin
                ? `Pinned at ${pin.lat.toFixed(6)}, ${pin.lng.toFixed(6)} · ${fmtKm(kmBetween(CAMPUS, pin))} from OAU campus. Drag the pin to adjust.`
                : "No pin yet. Use your location above, or tap the map on the house."}
            </p>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Area" id="area" hint="Filled from the pin. Edit it if it's wrong.">
                <input
                  id="area"
                  className="input"
                  value={form.area}
                  onChange={(e) => {
                    setAreaTouched(true);
                    set("area")(e);
                  }}
                  placeholder="e.g. Mayfair"
                />
              </Field>
              <Field label="Landmark (optional)" id="landmark">
                <input id="landmark" className="input" value={form.landmark} onChange={set("landmark")} placeholder="behind the Total filling station" />
              </Field>
              <Field label="Street address (optional)" id="address">
                <input id="address" className="input" value={form.address} onChange={set("address")} />
              </Field>
            </div>
          </section>

          {/* ---------- electricity (required) ---------- */}
          <section ref={lightRef} className={`panel p-6 ${error && form.electricity24 === null ? "ring-2 ring-bad/40" : ""}`}>
            <h2 className="text-lg font-bold" id="light-q">
              Does this house have 24hrs electricity? *
            </h2>
            <p className="mt-1 text-sm text-mut">Students filter by this more than anything else, so answer honestly.</p>
            <div className="mt-4 flex gap-3" role="radiogroup" aria-labelledby="light-q">
              {[
                [true, "Yes"],
                [false, "No"],
              ].map(([v, label]) => {
                const on = form.electricity24 === v;
                return (
                  <button
                    key={label}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setForm({ ...form, electricity24: v });
                      setError((e) => (e.startsWith("Answer the 24hrs") ? "" : e));
                    }}
                    className={`inline-flex h-12 min-w-[120px] items-center justify-center gap-2 rounded-2xl border px-6 font-bold transition-colors ${
                      on ? (v ? "border-gold bg-gold text-[#1a1405]" : "border-teal bg-teal text-onteal") : "border-line bg-sf hover:bg-sf2"
                    }`}
                  >
                    {v && <Icon name="bolt" size={16} fill="currentColor" />}
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          {/* ---------- amenities ---------- */}
          <section className="panel p-6">
            <h2 className="mb-4 text-lg font-bold">Other amenities</h2>
            <div className="flex flex-wrap gap-2">
              {[...new Set([...amenityList.map((a) => a.key), ...form.amenities])].map((a) => {
                const on = form.amenities.includes(a);
                return (
                  <button
                    type="button"
                    key={a}
                    onClick={() => toggleAmenity(a)}
                    aria-pressed={on}
                    className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${on ? "border-teal bg-teal text-onteal" : "border-line bg-sf hover:bg-sf2"}`}
                  >
                    {labelFrom(amenityList, a)}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex max-w-sm gap-2">
              <input className="input h-10" value={customAmenity} onChange={(e) => setCustomAmenity(e.target.value)} placeholder="Add another, e.g. borehole" />
              <button type="button" onClick={addCustomAmenity} className="btn btn-ghost btn-sm h-10">
                Add
              </button>
            </div>
          </section>

          {/* ---------- cost ---------- */}
          <section className="panel space-y-4 p-6">
            <h2 className="text-lg font-bold">Cost</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rent (₦)" id="rent">
                <input id="rent" required inputMode="numeric" className="input" value={form.rent} onChange={setMoney("rent")} />
              </Field>
              <Field label="Rent period" id="period">
                <Select
                  id="period"
                  value={form.rentPeriod}
                  onChange={(v) => setForm({ ...form, rentPeriod: v })}
                  options={Object.entries(RENT_PERIODS).map(([value, label]) => ({ value, label }))}
                />
              </Field>
              <Field label="Agency fee (₦)" id="agency">
                <input id="agency" inputMode="numeric" className="input" value={form.agencyFee} onChange={setMoney("agencyFee")} />
              </Field>
              <Field label="Legal / agreement fee (₦)" id="legal">
                <input id="legal" inputMode="numeric" className="input" value={form.legalFee} onChange={setMoney("legalFee")} />
              </Field>
              <Field label="Caution fee (₦)" id="caution">
                <input id="caution" inputMode="numeric" className="input" value={form.cautionFee} onChange={setMoney("cautionFee")} />
              </Field>
              <Field label="Service charge (₦)" id="service">
                <input id="service" inputMode="numeric" className="input" value={form.serviceCharge} onChange={setMoney("serviceCharge")} />
              </Field>
            </div>
            <div>
              <span className="label">Other fees</span>
              <div className="space-y-2">
                {form.otherFees.map((f, i) => (
                  <div key={i} className="flex gap-2">
                    <input className="input" placeholder="Name, e.g. Waste fee" value={f.name} onChange={(e) => setFee(i, "name", e.target.value)} />
                    <input className="input w-40" inputMode="numeric" placeholder="₦" value={f.amount} onChange={(e) => setFee(i, "amount", e.target.value)} />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, otherFees: form.otherFees.filter((_, x) => x !== i) })}
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-full hover:bg-sf2"
                      aria-label="Remove fee"
                    >
                      <Icon name="x" />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={() => setForm({ ...form, otherFees: [...form.otherFees, { name: "", amount: "" }] })} className="mt-2 text-sm font-bold text-tealt hover:underline">
                Add a fee
              </button>
            </div>
          </section>

          {/* ---------- photos and videos ---------- */}
          <section className="panel space-y-5 p-6">
            <div>
              <h2 className="text-lg font-bold">Photos and video tour</h2>
              <p className="mt-1 text-sm text-mut">Houses with a short video tour get far more inspection requests.</p>
            </div>

            {(form.photos.length > 0 || previews.photos.length > 0) && (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
                {form.photos.map((p) => (
                  <div key={p} className="relative">
                    <Photo src={p} className="aspect-square w-full rounded-2xl" />
                    <button type="button" onClick={() => removeSaved(p, "photo")} className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-glass" aria-label="Remove photo">
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
                {previews.photos.map((u, i) => (
                  <div key={u} className="relative">
                    <img src={u} alt="" className="aspect-square w-full rounded-2xl object-cover ring-2 ring-gold" />
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-[#1a1405]">New</span>
                    <button
                      type="button"
                      onClick={() => setNewPhotos((l) => l.filter((_, x) => x !== i))}
                      className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-glass"
                      aria-label="Don't upload this photo"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {(form.videos.length > 0 || previews.videos.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {form.videos.map((v) => (
                  <div key={v} className="relative">
                    <video src={v} controls playsInline preload="metadata" className="aspect-video w-full rounded-2xl bg-night" />
                    <button type="button" onClick={() => removeSaved(v, "video")} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-glass" aria-label="Remove video">
                      <Icon name="x" size={15} />
                    </button>
                  </div>
                ))}
                {previews.videos.map((u, i) => (
                  <div key={u} className="relative">
                    <video src={u} controls playsInline preload="metadata" className="aspect-video w-full rounded-2xl bg-night ring-2 ring-gold" />
                    <span className="absolute bottom-12 left-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-[#1a1405]">
                      New · {mb(newVideos[i].size)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() => setNewVideos((l) => l.filter((_, x) => x !== i))}
                      className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-glass"
                      aria-label="Don't upload this video"
                    >
                      <Icon name="x" size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-line bg-bg px-6 py-7 text-center hover:bg-sf2">
                <Icon name="upload" size={22} className="text-tealt" />
                <span className="mt-2 font-semibold">Add photos</span>
                <span className="text-xs text-mut">
                  {MEDIA.photo.label}, up to {MEDIA.photo.maxMb} MB each · {photoCount}/{MEDIA.photo.max}
                </span>
                <input
                  type="file"
                  accept={MEDIA.photo.types.join(",")}
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    pickFiles("photo", [...e.target.files]);
                    e.target.value = "";
                  }}
                />
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-pdline bg-pdb px-6 py-7 text-center hover:brightness-95">
                <span className="text-2xl" aria-hidden="true">
                  🎥
                </span>
                <span className="mt-1 font-semibold text-pdt">Add a video tour</span>
                <span className="text-xs text-mut">
                  {MEDIA.video.label}, up to {MEDIA.video.maxMb} MB each · {videoCount}/{MEDIA.video.max}
                </span>
                <input
                  type="file"
                  accept={[...MEDIA.video.types, ".mov", ".3gp"].join(",")}
                  multiple
                  className="sr-only"
                  onChange={(e) => {
                    pickFiles("video", [...e.target.files]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            {fileErrors.length > 0 && (
              <ul className="space-y-1 rounded-2xl bg-badb px-4 py-3 text-sm font-semibold text-bad">
                {fileErrors.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ---------- sidebar ---------- */}
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <div className="rounded-[28px] bg-teal p-6 text-onteal">
            <p className="text-sm font-bold text-gold">What students will see</p>
            <div className="mt-4 space-y-2 text-sm">
              {preview.length ? (
                preview.map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-white/10 pb-2">
                    <span className="text-onteal/80">{k}</span>
                    <span className="font-bold">{naira(v)}</span>
                  </div>
                ))
              ) : (
                <p className="text-onteal/60">Enter the rent and fees to see the total.</p>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3">
              <span className="text-sm">Total</span>
              <span className="h-serif text-2xl text-gold">{naira(total)}</span>
            </div>
          </div>

          <ul className="panel space-y-2 p-5 text-sm">
            {[
              [!!pin, "House pinned on the map"],
              [form.electricity24 !== null, "24hrs electricity answered"],
              [!!form.title && num(form.rent) > 0, "Title and rent filled in"],
              [photoCount > 0, "At least one photo (recommended)"],
            ].map(([done, label]) => (
              <li key={label} className={`flex items-center gap-2 ${done ? "text-okt" : "text-mut"}`}>
                <Icon name={done ? "check" : "clock"} size={15} />
                {label}
              </li>
            ))}
          </ul>

          {progress !== null && (
            <div className="panel p-4" aria-live="polite">
              <div className="mb-2 flex justify-between text-sm font-semibold">
                <span>Uploading {newVideos.length ? "video" : "photos"}…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-sf2">
                <div className="h-full rounded-full bg-gold transition-[width]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}

          <ErrorNote>{error}</ErrorNote>
          <button className="btn btn-gold h-12 w-full" disabled={saving}>
            {saving ? (progress !== null ? `Uploading ${progress}%` : "Saving...") : editing ? "Save changes" : "Publish listing"}
          </button>
        </aside>
      </form>
    </>
  );
}
