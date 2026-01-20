/**
 * Shared GitHub utilities for CI scripts.
 */

/**
 * Checks if a URL value is valid (not empty, null, or placeholder).
 * @param {string | undefined} url - The URL to check
 * @returns {boolean} Whether the URL is valid
 */
export function isValidUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }
  const trimmed = url.trim().toLowerCase();
  // Check for common placeholder/invalid values
  return trimmed !== '' && trimmed !== 'n/a' && trimmed !== 'null' && trimmed !== 'undefined';
}

/**
 * Minimizes (hides) a comment using GitHub GraphQL API.
 * @param {import('@octokit/rest').Octokit} octokit - Octokit instance
 * @param {string} nodeId - The GraphQL node ID of the comment
 * @returns {Promise<boolean>} Whether the operation was successful
 */
export async function minimizeComment(octokit, nodeId) {
  try {
    await octokit.graphql(
      `
      mutation MinimizeComment($id: ID!, $classifier: ReportedContentClassifiers!) {
        minimizeComment(input: { subjectId: $id, classifier: $classifier }) {
          minimizedComment {
            isMinimized
            minimizedReason
          }
        }
      }
      `,
      {
        id: nodeId,
        classifier: 'OUTDATED',
      },
    );
    return true;
  } catch (error) {
    console.error(`Failed to minimize comment ${nodeId}:`, error.message);
    return false;
  }
}
