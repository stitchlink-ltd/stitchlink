export function RequestImageViewer({ images }: { images: { id: string }[] }) {
  if (images.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {images.map((image) => (
        <a
          key={image.id}
          href={`/api/request-images/${image.id}`}
          target="_blank"
          rel="noreferrer"
          className="block size-20 overflow-hidden rounded-lg border border-line bg-background"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- private image behind a signed-URL redirect route, not a static asset */}
          <img src={`/api/request-images/${image.id}`} alt="Inspiration reference" className="h-full w-full object-cover transition hover:opacity-80" />
        </a>
      ))}
    </div>
  );
}
