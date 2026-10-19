import { useEffect, useState } from "react";
import { cachedPhotoIds } from "./store";
import { Photo, Sheet } from "./ui";

export function CachedPhotos({
  onSelect,
  onClose,
}: {
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const [ids, setIds] = useState<string[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    cachedPhotoIds()
      .then((ids) => {
        if (active) setIds(ids);
      })
      .catch(() => {
        if (active) setError("Could not open saved photos. Try again.");
      });
    return () => {
      active = false;
    };
  }, []);
  return (
    <Sheet title="Saved price-tag photos" onClose={onClose}>
      <p className="fine">
        Price tags you’ve photographed before. Choose one to reuse it.
      </p>
      {error ? (
        <p role="alert">{error}</p>
      ) : ids === null ? (
        <p role="status">Loading saved photos…</p>
      ) : ids.length === 0 ? (
        <p>No saved price tags yet. Photograph or upload a tag to add one.</p>
      ) : (
        <div className="cached-photo-grid">
          {ids.map((id, index) => (
            <button
              key={id}
              onClick={() => onSelect(id)}
              aria-label={`Reuse saved price tag ${index + 1}`}
            >
              <Photo id={id} alt={`Saved price tag ${index + 1}`} />
              <span>Use this photo</span>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
