import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errMsg } from "../../api/client";
import ListingCard from "../../components/ListingCard";
import { EmptyState, ErrorNote, PageTitle, Spinner } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";

export default function Favourites() {
  const { user } = useAuth();
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/bookmarks")
      .then((res) => setItems(res.data.bookmarks))
      .catch((err) => setError(errMsg(err)));
  }, []);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!items) return <Spinner label="Loading favourites" />;

  // hide ones unsaved on this page straight away
  const visible = items.filter((l) => user.bookmarks?.includes(l._id));

  return (
    <>
      <PageTitle title="Favourites" text="Houses you saved to come back to." />
      {visible.length === 0 ? (
        <EmptyState
          title="No saved houses yet"
          text="Tap the heart on any house to keep it here."
          action={
            <Link to="/listings" className="btn btn-gold">
              Find a house
            </Link>
          }
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((l) => (
            <ListingCard key={l._id} listing={l} />
          ))}
        </div>
      )}
    </>
  );
}
