"use client";

import { useState } from "react";

export default function Gallery({ photoIds, title }: { photoIds: string[]; title: string }) {
  const [i, setI] = useState(0);
  return (
    <div className="gal">
      <div className="big">
        {photoIds.length ? (
          <img src={`/api/photos/${photoIds[i]}`} alt={title} />
        ) : (
          <div className="ph" aria-hidden="true">{title.charAt(0).toUpperCase()}</div>
        )}
      </div>
      {photoIds.length > 1 && (
        <div className="thumbs">
          {photoIds.map((id, n) => (
            <button key={id} type="button" aria-pressed={n === i} aria-label={`Photo ${n + 1}`} onClick={() => setI(n)}>
              <img src={`/api/photos/${id}`} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
