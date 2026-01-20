import { Octokit } from '@octokit/rest';
import { minimizeComment, isValidUrl } from './lib/github-utils.mjs';

const RC_BUILD_COMMENT_MARKER = '<!-- metamask-bot-rc-build-announce -->';
const TESTFLIGHT_URL = 'https://testflight.apple.com/join/hBrjtFuA';

/**
 * Posts a new PR comment with RC build links and minimizes older RC build comments.
 * Each RC build creates a new comment at the bottom of the PR, while older RC build comments
 * are automatically minimized (hidden) to keep the PR timeline clean.
 *
 * iOS uses TestFlight link with build number reference.
 * Android uses Bitrise public install page URL.
 *
 * Requires environment variables: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, SEMVER,
 * BUILD_NUMBER, ANDROID_PUBLIC_URL, BITRISE_PIPELINE_URL
 *
 * @returns {Promise<void>}
 */
async function start() {
  const {
    GITHUB_TOKEN,
    GITHUB_REPOSITORY,
    PR_NUMBER,
    SEMVER,
    BUILD_NUMBER,
    ANDROID_PUBLIC_URL,
    BITRISE_PIPELINE_URL,
  } = process.env;

  // Validate required environment variables
  if (!GITHUB_TOKEN?.trim() || !GITHUB_REPOSITORY?.trim() || !PR_NUMBER?.trim()) {
    console.error(
      'Missing or empty required environment variables: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER',
    );
    process.exit(1);
  }

  const [owner, repo] = GITHUB_REPOSITORY.split('/');
  if (!owner || !repo) {
    console.error(`GITHUB_REPOSITORY must be in format owner/repo, got: ${GITHUB_REPOSITORY}`);
    process.exit(1);
  }

  const prNumber = parseInt(PR_NUMBER, 10);
  if (isNaN(prNumber) || prNumber <= 0) {
    console.error(`PR_NUMBER must be a positive integer, got: ${PR_NUMBER}`);
    process.exit(1);
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  // Build the comment body
  const rows = [];
  const version = SEMVER || 'Unknown';
  const buildNum = BUILD_NUMBER || 'Unknown';

  // iOS always uses TestFlight link with build number reference
  rows.push(`| **iOS** | [TestFlight](${TESTFLIGHT_URL}) | Go to TestFlight and download build \`${buildNum}\` |`);

  // Add Android row if public URL is available
  if (isValidUrl(ANDROID_PUBLIC_URL)) {
    rows.push(`| **Android** | [Install](${ANDROID_PUBLIC_URL}) | RC ${version} (${buildNum}) |`);
  } else {
    console.error('ERROR: No Android public install URL available.');
    console.error(`  ANDROID_PUBLIC_URL: ${ANDROID_PUBLIC_URL || '(not set)'}`);
    console.error('This may indicate a Bitrise configuration issue - artifact may not have public page enabled.');
    process.exit(1);
  }

  const pipelineLink = isValidUrl(BITRISE_PIPELINE_URL)
    ? `[View Pipeline](${BITRISE_PIPELINE_URL})`
    : 'Not available';

  const commentBody = `${RC_BUILD_COMMENT_MARKER}
### :rocket: RC Builds Ready for Testing

| Platform | Link | Version |
| :--- | :--- | :--- |
${rows.join('\n')}

<details>
<summary>More Info</summary>

*   **Version**: \`${version}\`
*   **Build Number**: \`${buildNum}\`
*   **Bitrise Pipeline**: ${pipelineLink}
</details>
`;

  // Post new comment and minimize old ones
  try {
    console.log(`\n=== Searching for existing RC build comments on PR #${prNumber} ===`);
    const comments = await octokit.paginate(octokit.rest.issues.listComments, {
      owner,
      repo,
      issue_number: prNumber,
    });

    console.log(`Found ${comments.length} total comments on PR #${prNumber}`);

    // Find all existing RC build bot comments
    const existingBotComments = comments.filter(
      (comment) => comment.body && comment.body.includes(RC_BUILD_COMMENT_MARKER),
    );

    console.log(`Found ${existingBotComments.length} existing RC build comment(s)`);

    // Create new comment first (so it appears at the bottom)
    console.log('Creating new comment with RC build URLs...');
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: commentBody,
    });
    console.log(`✓ Successfully created new comment with RC build URLs`);

    // Minimize all previous RC build comments
    if (existingBotComments.length > 0) {
      console.log(`\n=== Minimizing ${existingBotComments.length} older RC build comment(s) ===`);
      for (const comment of existingBotComments) {
        if (comment.node_id) {
          console.log(`Minimizing comment ID: ${comment.id} (node_id: ${comment.node_id})`);
          const success = await minimizeComment(octokit, comment.node_id);
          if (success) {
            console.log(`✓ Minimized comment ${comment.id}`);
          }
        } else {
          console.warn(`Comment ${comment.id} does not have a node_id, skipping minimization`);
        }
      }
      console.log(`✓ Finished processing older RC build comments`);
    }
  } catch (error) {
    console.error('Error posting/minimizing comments:', error);
    if (error.status === 403) {
      console.error('Permission denied. Ensure the GITHUB_TOKEN has "pull-requests: write" permission.');
    }
    process.exit(1);
  }
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
