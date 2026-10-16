/** Files in public/ resolved against the site's base path (it may live in a sub-folder). */
export const publicUrl = (path: string): string => `${import.meta.env.BASE_URL}${path}`;

/** Compressed lesson video, made by `npm run videos`. */
export const signVideo = (id: string): string => publicUrl(`signs/${id}.mp4`);
export const signPoster = (id: string): string => publicUrl(`signs/${id}.webp`);
