/**
 * Determines whether a feed post was authored by the signed-in social profile.
 *
 * @param authorId - The post author's social profile id.
 * @param viewerProfileId - The signed-in viewer's social profile id.
 * @returns True when both ids are available and match.
 */
export const isViewerSocialAuthor = (
  authorId: string,
  viewerProfileId: string | undefined,
): boolean => Boolean(viewerProfileId && authorId === viewerProfileId);
