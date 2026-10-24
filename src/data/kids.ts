/**
 * The kids' section (pages/KidsPage.tsx): cartoons and comic books.
 *
 * The files go into public/kids/ and the paths below are relative to public/.
 * While a list is empty, the page says the items are coming soon.
 */
export interface Cartoon {
  id: string;
  /** The title shown under the video, e.g. 'Алдар Көсе'. */
  title: string;
  /** A compressed MP4, e.g. 'kids/cartoons/aldar-kose.mp4'. */
  video: string;
  /** A still frame shown before it plays, e.g. 'kids/cartoons/aldar-kose.webp'. */
  poster?: string;
}

export interface Comic {
  id: string;
  title: string;
  /** Shown first when the book is opened. */
  cover: string;
  /** The pages after the cover, in reading order. */
  pages: readonly string[];
}

/** Pages named 01.webp, 02.webp, … in public/kids/books/<id>/. */
export const comicPages = (id: string, count: number, ext = 'webp'): string[] =>
  Array.from({ length: count }, (_, i) => `kids/books/${id}/${String(i + 1).padStart(2, '0')}.${ext}`);

export const CARTOONS: readonly Cartoon[] = [
  {
    id: 'aldar-kose-tilsiz-dos',
    title: 'Алдар Көсе және тілсіз дос',
    video: 'kids/cartoons/aldar-kose-tilsiz-dos.mp4',
    poster: 'kids/cartoons/aldar-kose-tilsiz-dos.webp',
  },
];

export const COMICS: readonly Comic[] = [
  // A one-page comic: all nine panels are on the cover.
  { id: 'ake-men-bala', title: 'Әке мен бала', cover: 'kids/books/ake-men-bala/cover.webp', pages: [] },
];
