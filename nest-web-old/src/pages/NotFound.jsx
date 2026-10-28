import { Link } from "react-router-dom";
import { EmptyState } from "../components/ui";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-6 py-24">
      <EmptyState
        title="This page doesn't exist"
        text="The link may be old, or the house may have been removed."
        action={<Link to="/listings" className="btn btn-gold">Browse houses</Link>}
      />
    </div>
  );
}
