#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

const ARTIFACTS_COMMENT_MARKER = '<!-- metamask-bot-build-announce -->';

async function start() {
  const {
    GITHUB_TOKEN,
    GITHUB_REPOSITORY,
    PR_NUMBER,
    GITHUB_RUN_ID,
  } = process.env;

  if (!GITHUB_TOKEN || !GITHUB_REPOSITORY || !PR_NUMBER || !GITHUB_RUN_ID) {
    console.error('Missing required environment variables: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, GITHUB_RUN_ID');
    process.exit(1);
  }

  const [owner, repo] = GITHUB_REPOSITORY.split('/');
  const octokit = new Octokit({ auth: GITHUB_TOKEN });
  const prNumber = parseInt(PR_NUMBER, 10);

  // 1. Extract iOS Build Number
  let iosBuildNumber = 'Unknown';
  try {
    // Assuming the script is run from project root or scripts folder, adjust path accordingly.
    // In CI, it runs from root: node scripts/post-build-comment.js
    const pbxprojPath = path.resolve(__dirname, '../ios/MetaMask.xcodeproj/project.pbxproj');
    
    if (fs.existsSync(pbxprojPath)) {
      const pbxprojContent = fs.readFileSync(pbxprojPath, 'utf8');
      const match = pbxprojContent.match(/CURRENT_PROJECT_VERSION = (\d+);/);
      if (match && match[1]) {
        iosBuildNumber = match[1];
      }
    } else {
      console.warn(`iOS project file not found at ${pbxprojPath}`);
    }
  } catch (error) {
    console.error('Error reading iOS build number:', error);
  }

  // 2. Construct Comment Body
  const testFlightLink = 'https://testflight.apple.com/join/hBrjtFuA';
  const artifactsUrl = `https://github.com/${owner}/${repo}/actions/runs/${GITHUB_RUN_ID}`;

  const commentBody = `${ARTIFACTS_COMMENT_MARKER}
### 🚀 Builds Ready for Testing

| Platform | Link | Note |
| :--- | :--- | :--- |
| **iOS** | [Install via TestFlight](${testFlightLink}) | Build: \`${iosBuildNumber}\` |
| **Android** | [Download Artifacts](${artifactsUrl}) | Check "Artifacts" section |

<details>
<summary>Debug Info</summary>

*   Run ID: \`${GITHUB_RUN_ID}\`
*   iOS Build Number: \`${iosBuildNumber}\`
</details>
`;

  // 3. Post or Update Comment
  try {
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
      per_page: 100, // Increase page size
    });
    
    // If there are more than 100 comments, we might need pagination, but 100 is a good start.
    // For robustness, let's just check the last 100 comments.
    // If the comment is older than that, posting a new one is probably fine (it's buried).

    const existingComment = comments.find((comment) =>
      comment.body.includes(ARTIFACTS_COMMENT_MARKER)
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
