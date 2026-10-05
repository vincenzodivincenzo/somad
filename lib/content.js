import { readDoc } from "./store.js";
import seedTrips from "../data/trips.json" with { type: "json" };
import seedGallery from "../data/gallery.json" with { type: "json" };
import seedSettings from "../data/site.json" with { type: "json" };

export const KINDS = {
  trips: { path: "content/trips.json", seed: seedTrips },
  gallery: { path: "content/gallery.json", seed: seedGallery },
  settings: { path: "content/settings.json", seed: seedSettings },
};

export async function readContent() {
  const [t, g, s] = await Promise.all(Object.values(KINDS).map((k) => readDoc(k.path, k.seed)));
  return { trips: t.data, gallery: g.data, settings: s.data };
}
