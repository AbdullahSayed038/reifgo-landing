import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { APP_WEB_URL } from "../lib/siteLinks.js";

/**
 * The website doesn't list properties (Syed, Oct 27): listings live in the
 * REIFGO app. A link to an old /property/<id> page goes to the same listing
 * in the app's web version instead.
 */
export default function AppListingRedirect() {
  const { id } = useParams();
  useEffect(() => {
    window.location.replace(`${APP_WEB_URL}/property/${encodeURIComponent(id ?? "")}`);
  }, [id]);
  return null;
}
