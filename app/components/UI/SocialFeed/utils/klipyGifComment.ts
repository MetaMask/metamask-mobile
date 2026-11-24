/** Host Klipy serves GIF files from. social-api allowlists this domain in comment text. */
export const KLIPY_STATIC_GIF_HOST = 'static.klipy.com';

/**
 * Example file URL from the KLIPY search/trending payload (`file.md.gif.url`).
 * Page URLs like `klipy.com/gifs/...` are not the media the feed renders.
 */
export const KLIPY_STATIC_GIF_EXAMPLE =
  'https://static.klipy.com/ii/935d7ab9d8c6202580a668421940ec81/14/af/um0L4dFH.gif';

const KLIPY_STATIC_GIF_URL_PATTERN =
  /https:\/\/static\.klipy\.com\/[^\s<>"']+?\.gif(?:\?[^\s<>"']*)?/gi;

export const isKlipyStaticGifUrl = (value: string): boolean => {
  try {
    const url = new URL(value.trim());
    return (
      url.protocol === 'https:' &&
      url.hostname.toLowerCase() === KLIPY_STATIC_GIF_HOST &&
      url.pathname.toLowerCase().endsWith('.gif')
    );
  } catch {
    return false;
  }
};

/**
 * Puts the GIF file URL in `commentText` so `POST /swap-comments` can persist
 * it. Caption first, URL on its own line; GIF-only posts are just the URL.
 */
export const appendKlipyGifUrlToCommentText = (
  commentText: string,
  gifUrl: string | null | undefined,
): string => {
  const caption = commentText.trim();
  const gif = gifUrl?.trim() ?? '';
  if (!gif || !isKlipyStaticGifUrl(gif)) {
    return caption;
  }
  if (!caption) {
    return gif;
  }
  return `${caption}\n${gif}`;
};

export const splitKlipyGifFromCommentText = (
  commentText: string,
): { text: string; gifUrl?: string } => {
  const trimmed = commentText.trim();
  const matches = [...trimmed.matchAll(KLIPY_STATIC_GIF_URL_PATTERN)];
  const gifUrl = matches.at(-1)?.[0];
  if (!gifUrl || !isKlipyStaticGifUrl(gifUrl)) {
    return { text: trimmed };
  }

  const text = trimmed.replace(gifUrl, '').trim();
  return { text, gifUrl };
};
