/** Colors applied to the bundled Social terms document for the active app theme. */
export interface SocialTermsPalette {
  background: string;
  text: string;
  heading: string;
  link: string;
  colorScheme: 'light' | 'dark';
}

// The bundled document's default light palette. Render time replaces it with
// theme tokens; these literals exist only so that replacement can find the block.
const TERMS_ROOT_STYLE =
  // eslint-disable-next-line @metamask/design-tokens/color-no-hex
  ':root { color-scheme: light; --terms-bg: #ffffff; --terms-text: #24272a; --terms-heading: #161819; --terms-link: #3155d4; }';

/**
 * Replaces the document's default light palette with the app theme.
 * The bundled HTML does not follow `prefers-color-scheme`, so a WebView
 * scroll cannot flip the page back to white.
 *
 * @param html - Bundled terms document.
 * @param palette - Resolved app theme colors.
 * @returns The document with the theme palette written into `:root`.
 */
export const themeSocialTermsHtml = (
  html: string,
  palette: SocialTermsPalette,
): string =>
  html.replace(
    TERMS_ROOT_STYLE,
    `:root { color-scheme: ${palette.colorScheme}; --terms-bg: ${palette.background}; --terms-text: ${palette.text}; --terms-heading: ${palette.heading}; --terms-link: ${palette.link}; }`,
  );
