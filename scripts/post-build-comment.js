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
      
      // Use matchAll to find all occurrences and check consistency
      const matches = [...pbxprojContent.matchAll(/CURRENT_PROJECT_VERSION = (\d+);/g)];
      
      if (matches.length > 0) {
        const versions = matches.map(m => m[1]);
        const uniqueVersions = new Set(versions);
        
        if (uniqueVersions.size > 1) {
          console.warn('Multiple different CURRENT_PROJECT_VERSION values found in project.pbxproj:', Array.from(uniqueVersions));
        }
        
        // Use the first one found
        iosBuildNumber = versions[0];
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
    // Fetch comments with pagination handling
    let comments = [];
    let page = 1;
    const perPage = 100;
    
    while (true) {
      const { data: pageComments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: prNumber,
        per_page: perPage,
        page: page,
      });
      
      comments = comments.concat(pageComments);
      
      if (pageComments.length < perPage) {
        break;
      }
      page++;
    }
    
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
    // If we fail on a fork due to permissions, we should probably just log it and exit gracefully
    // rather than failing the whole build, since external contributors can't post comments.
    // However, keeping exit(1) for now to match requirements unless requested otherwise.
    process.exit(1);
  }
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
