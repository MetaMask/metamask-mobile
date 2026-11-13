/** The invite terms link copy and the URL it opens. */
export interface InviteTermsLink {
  label: string;
  url: string;
}

/**
 * Resolves the optional "Learn more" link shown after invite copy.
 *
 * The link renders only when the label is non-blank and the URL is a non-blank
 * `https://` address. Otherwise it returns null, so a blank Contentful value
 * hides the link instead of showing a dead one.
 *
 * @param localizedText - The server copy for the invite terms link keys.
 * @returns The trimmed label and URL, or null when the link should not render.
 */
export function resolveInviteTermsLink(
  localizedText:
    | {
        inviteTermsLearnMore?: string | null;
        inviteTermsUrl?: string | null;
      }
    | null
    | undefined,
): InviteTermsLink | null {
  const label = localizedText?.inviteTermsLearnMore?.trim() ?? '';
  const url = localizedText?.inviteTermsUrl?.trim() ?? '';

  if (label.length === 0 || !url.startsWith('https://')) {
    return null;
  }

  return { label, url };
}
