import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { errMsg } from "../../api/client";
import { ErrorNote, Icon, PageTitle, Photo, Spinner } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { AREAS, ELECTRICITY, naira, RENT_PERIODS, ROOM_TYPES } from "../../utils/format";
import useAmenities, { labelFrom } from "../../utils/useAmenities";
import { VerificationBanner } from "./AgentDashboard";

const BLANK = {
  title: "",
  description: "",
  area: "Mayfair",
  address: "",
  distanceFromCampusKm: "",
  roomType: "self_contained",
  bedrooms: 1,
  bathrooms: 1,
  isShared: false,
  spacesForRoommates: 0,
  amenities: [],
  rent: "",
  rentPeriod: "yearly",
  agencyFee: "",
  legalFee: "",
  cautionFee: "",
  serviceCharge: "",
  otherFees: [],
  photos: [],
};

const num = (v) => Number(String(v).replace(/\D/g, "")) || 0;

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

export default function ListingForm() {
  const { id } = useParams();
  const editing = !!id;
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState(BLANK);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [customAmenity, setCustomAmenity] = useState("");
  const amenityList = useAmenities();

  useEffect(() => {
    if (!editing) return;
    api
      .get(`/listings/${id}`)
      .then(({ data }) => {
        const l = data.listing;
        setForm({
          ...BLANK,
          ...l,
          distanceFromCampusKm: l.distanceFromCampusKm ?? "",
          otherFees: l.otherFees || [],
        });
      })
      .catch((err) => setError(errMsg(err)))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value });
  const setMoney = (key) => (e) => setForm({ ...form, [key]: e.target.value.replace(/\D/g, "") });

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

  // live preview of what students will see
  const preview = [
    ["Rent", num(form.rent)],
    ["Agency fee", num(form.agencyFee)],
    ["Legal fee", num(form.legalFee)],
    ["Caution fee", num(form.cautionFee)],
    ["Service charge", num(form.serviceCharge)],
    ...form.otherFees.filter((f) => f.name).map((f) => [f.name, num(f.amount)]),
  ].filter(([, v]) => v > 0);
  const total = preview.reduce((s, [, v]) => s + v, 0);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const body = {
        title: form.title,
        description: form.description,
        area: form.area,
        address: form.address,
        roomType: form.roomType,
        bedrooms: Number(form.bedrooms) || 1,
        bathrooms: Number(form.bathrooms) || 1,
        isShared: form.isShared,
        spacesForRoommates: form.isShared ? Number(form.spacesForRoommates) || 1 : 0,
        amenities: form.amenities,
        rent: num(form.rent),
        rentPeriod: form.rentPeriod,
        agencyFee: num(form.agencyFee),
        legalFee: num(form.legalFee),
        cautionFee: num(form.cautionFee),
        serviceCharge: num(form.serviceCharge),
        otherFees: form.otherFees.filter((f) => f.name).map((f) => ({ name: f.name, amount: num(f.amount) })),
      };
      if (form.distanceFromCampusKm !== "") body.distanceFromCampusKm = Number(form.distanceFromCampusKm);
      if (editing) body.photos = form.photos;

      const res = editing ? await api.patch(`/listings/${id}`, body) : await api.post("/listings", body);
      const listingId = res.data.listing._id;

      // photos go up after the listing exists
      if (files.length) {
        const fd = new FormData();
        files.forEach((f) => fd.append("photos", f));
        await api.post(`/listings/${listingId}/photos`, fd);
      }

      toast(editing ? "Listing updated" : "Listing published");
      navigate("/agent");
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSaving(false);
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

      <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="panel space-y-4 p-6">
            <h2 className="text-lg font-bold">The house</h2>
            <Field label="Listing title" id="title">
              <input id="title" required className="input" value={form.title} onChange={set("title")} placeholder="e.g. Tiled self-con near Fajuyi gate" />
            </Field>
            <Field label="Description" id="desc">
              <textarea id="desc" rows={4} className="input" value={form.description} onChange={set("description")} placeholder="Water, light, the compound, the street..." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Area" id="area">
                <input id="area" required list="areas" className="input" value={form.area} onChange={set("area")} />
                <datalist id="areas">
                  {AREAS.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </Field>
              <Field label="Street address" id="address">
                <input id="address" className="input" value={form.address} onChange={set("address")} />
              </Field>
              <Field label="Distance from campus (km)" id="dist">
                <input id="dist" type="number" step="0.1" min="0" className="input" value={form.distanceFromCampusKm} onChange={set("distanceFromCampusKm")} />
              </Field>
              <Field label="Room type" id="roomType">
                <select id="roomType" className="input" value={form.roomType} onChange={set("roomType")}>
                  {Object.entries(ROOM_TYPES).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
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

          <section className="panel p-6">
            <h2 className="text-lg font-bold">Amenities</h2>
            <p className="mb-4 mt-1 text-sm text-mut">24hrs electricity is what students filter by most. Tick it if the house has it.</p>
            <div className="flex flex-wrap gap-2">
              {[...new Set([...amenityList.map((a) => a.key), ...form.amenities])].map((a) => {
                const on = form.amenities.includes(a);
                const light = a === ELECTRICITY;
                return (
                  <button
                    type="button"
                    key={a}
                    onClick={() => toggleAmenity(a)}
                    aria-pressed={on}
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[13px] font-semibold ${
                      on ? (light ? "border-gold bg-gold text-[#1a1405]" : "border-teal bg-teal text-onteal") : light ? "border-pdline bg-pdb text-pdt" : "border-line bg-sf hover:bg-sf2"
                    }`}
                  >
                    {light && <Icon name="bolt" size={13} fill="currentColor" />}
                    {labelFrom(amenityList, a)}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex max-w-sm gap-2">
              <input className="input h-10" value={customAmenity} onChange={(e) => setCustomAmenity(e.target.value)} placeholder="Add another, e.g. wardrobe" />
              <button type="button" onClick={addCustomAmenity} className="btn btn-ghost btn-sm h-10">
                Add
              </button>
            </div>
          </section>

          <section className="panel space-y-4 p-6">
            <h2 className="text-lg font-bold">Cost</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Rent (₦)" id="rent">
                <input id="rent" required inputMode="numeric" className="input" value={form.rent} onChange={setMoney("rent")} />
              </Field>
              <Field label="Rent period" id="period">
                <select id="period" className="input" value={form.rentPeriod} onChange={set("rentPeriod")}>
                  {Object.entries(RENT_PERIODS).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
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

          <section className="panel p-6">
            <h2 className="mb-4 text-lg font-bold">Photos</h2>
            {form.photos.length > 0 && (
              <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {form.photos.map((p) => (
                  <div key={p} className="relative">
                    <Photo src={p} className="aspect-square w-full rounded-2xl" />
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, photos: form.photos.filter((x) => x !== p) })}
                      className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-glass"
                      aria-label="Remove photo"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-line bg-bg px-6 py-8 text-center hover:bg-sf2">
              <Icon name="upload" size={24} className="text-tealt" />
              <span className="mt-2 font-semibold">{files.length ? `${files.length} photo${files.length > 1 ? "s" : ""} picked` : "Pick photos to upload"}</span>
              <span className="text-xs text-mut">Up to 8 images. They upload when you save.</span>
              <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => setFiles([...e.target.files].slice(0, 8))} />
            </label>
          </section>
        </div>

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
          <ErrorNote>{error}</ErrorNote>
          <button className="btn btn-gold h-12 w-full" disabled={saving}>
            {saving ? "Saving..." : editing ? "Save changes" : "Publish listing"}
          </button>
        </aside>
      </form>
    </>
  );
}
