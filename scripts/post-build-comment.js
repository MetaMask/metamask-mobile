#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

const ARTIFACTS_COMMENT_MARKER = '<!-- metamask-bot-build-announce -->';

/**
 * Posts or updates a PR comment with build artifacts links.
 * Requires environment variables: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, GITHUB_RUN_ID
 *
 * @returns {Promise<void>}
 */
async function start() {
  const {
    GITHUB_TOKEN,
    GITHUB_REPOSITORY,
    PR_NUMBER,
    GITHUB_RUN_ID,
    ANDROID_BUILD_SUCCESS,
    IOS_BUILD_SUCCESS,
    IOS_ARTIFACTS_URL,
    ANDROID_ARTIFACTS_URL,
  } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !PR_NUMBER || !GITHUB_RUN_ID) {
    console.error('Missing required environment variables: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, GITHUB_RUN_ID');
    process.exit(1);
  }

  const [owner, repo] = GITHUB_REPOSITORY.split('/');
  if (!owner || !repo) {
    console.error('GITHUB_REPOSITORY must be in format owner/repo');
    process.exit(1);
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });
  const prNumber = parseInt(PR_NUMBER, 10);

  if (isNaN(prNumber) || prNumber <= 0) {
    console.error('PR_NUMBER must be a positive integer');
    process.exit(1);
  }

  // 1. Extract iOS Build Number
  let iosBuildNumber = 'Unknown';
  try {
    const pbxprojPath = path.resolve(__dirname, '../ios/MetaMask.xcodeproj/project.pbxproj');

    if (fs.existsSync(pbxprojPath)) {
      const pbxprojContent = fs.readFileSync(pbxprojPath, 'utf8');

      const matches = [...pbxprojContent.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)];

      if (matches.length > 0) {
        const versions = matches.map((m) => m[1]);
        const uniqueVersions = new Set(versions);

        if (uniqueVersions.size > 1) {
          console.warn('Multiple different CURRENT_PROJECT_VERSION values found in project.pbxproj:', Array.from(uniqueVersions));
        }

        iosBuildNumber = versions[0];
      }
    } else {
      console.warn(`iOS project file not found at ${pbxprojPath}`);
    }
  } catch (error) {
    console.error('Error reading iOS build number:', error);
  }

  // 2. Construct Comment Body
  // Use provided URLs or fallback to standard run URL
  const defaultArtifactsUrl = `https://github.com/${owner}/${repo}/actions/runs/${GITHUB_RUN_ID}`;
  const iosUrl = IOS_ARTIFACTS_URL || defaultArtifactsUrl;
  const androidUrl = ANDROID_ARTIFACTS_URL || defaultArtifactsUrl;

  // Use specific emojis and format to match the requested style more closely
  const rows = [];

  if (IOS_BUILD_SUCCESS === 'true') {
    // Link to GitHub artifacts for Simulator build
    rows.push(`| :apple: **iOS** | [Download Artifacts](${iosUrl}) | Build: \`${iosBuildNumber}\` |`);
  }

  if (ANDROID_BUILD_SUCCESS === 'true') {
    rows.push(`| :robot: **Android** | [Download Artifacts](${androidUrl}) | Check "Artifacts" section |`);
  }

  if (rows.length === 0) {
    console.log('No successful builds to report');
    process.exit(0);
  }

  const commentBody = `${ARTIFACTS_COMMENT_MARKER}
### 🚀 Builds Ready for Testing

| Platform | Link | Note |
| :--- | :--- | :--- |
${rows.join('\n')}

<details>
<summary>Debug Info</summary>

*   Run ID: \`${GITHUB_RUN_ID}\`
*   iOS Build Number: \`${iosBuildNumber}\`
</details>
`;

  // 3. Post or Update Comment
  try {
    const comments = await octokit.paginate(octokit.rest.issues.listComments, {
      owner,
      repo,
      issue_number: prNumber,
    });

    const existingComment = comments.find((comment) =>
      comment.body && comment.body.includes(ARTIFACTS_COMMENT_MARKER)
    );

    if (existingComment) {
      console.log(`Updating existing comment ID: ${existingComment.id}`);
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody,
      });
    } else {
      console.log('Creating new comment');
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: commentBody,
      });
    }
  } catch (error) {
    console.error('Error posting/updating comment:', error);
    process.exit(1);
  }
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
