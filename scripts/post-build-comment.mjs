/* eslint-disable import/no-nodejs-modules */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Octokit } from '@octokit/rest';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARTIFACTS_COMMENT_MARKER = '<!-- metamask-bot-build-announce -->';

/**
 * Fetches job IDs from GitHub Actions API for a given workflow run
 * Uses pagination to ensure all jobs are retrieved, even if there are more than 30 jobs
 * @param {Octokit} octokit - Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} runId - Workflow run ID
 * @returns {Promise<{androidJobId: string | null, iosJobId: string | null, androidFlaskJobId: string | null}>} Object with job IDs
 */
async function fetchJobIds(octokit, owner, repo, runId) {
  try {
    console.log(`Fetching jobs for workflow run: ${runId}`);
    // Use paginate to handle workflows with more than 30 jobs
    const allJobs = await octokit.paginate(octokit.rest.actions.listJobsForWorkflowRun, {
      owner,
      repo,
      run_id: runId,
    });

    console.log(`Found ${allJobs.length} jobs in workflow run ${runId}`);
    console.log('All job names:', allJobs.map((job) => `"${job.name}"`).join(', '));

    // Find jobs by name - reusable workflows may have composite names like:
    // "Build Android APKs / Build Android E2E APKs" or just "Build Android E2E APKs"
    // When reusable workflows are called, job names can be:
    // 1. Exact match: "Build Android APKs" (caller job name)
    // 2. Composite: "Build Android APKs / Build Android E2E APKs" (caller / reusable)
    // 3. Reusable only: "Build Android E2E APKs" (from reusable workflow)
    // Try multiple patterns for robustness
    const androidJob =
      allJobs.find((job) => job.name === 'Build Android APKs') ||
      allJobs.find((job) => job.name.includes('Build Android APKs') && job.name.includes('Build Android E2E APKs') && !job.name.includes('Flask')) ||
      allJobs.find((job) => job.name === 'Build Android E2E APKs' && !job.name.includes('Flask')) ||
      allJobs.find((job) => job.name.includes('Android') && job.name.includes('E2E') && job.name.includes('APK') && !job.name.includes('Flask'));

    const iosJob =
      allJobs.find((job) => job.name === 'Build iOS Apps') ||
      allJobs.find((job) => job.name.includes('Build iOS Apps') && job.name.includes('Build iOS E2E Apps')) ||
      allJobs.find((job) => job.name === 'Build iOS E2E Apps') ||
      allJobs.find((job) => job.name.includes('iOS') && job.name.includes('E2E') && job.name.includes('Apps'));

    const androidFlaskJob =
      allJobs.find((job) => job.name === 'Build Android Flask APKs') ||
      allJobs.find((job) => job.name.includes('Build Android Flask APKs') && job.name.includes('Build Android E2E APKs')) ||
      allJobs.find((job) => job.name.includes('Flask') && job.name.includes('Build Android E2E APKs')) ||
      allJobs.find((job) => job.name.includes('Android') && job.name.includes('Flask') && job.name.includes('E2E'));

    const result = {
      androidJobId: androidJob ? String(androidJob.id) : null,
      iosJobId: iosJob ? String(iosJob.id) : null,
      androidFlaskJobId: androidFlaskJob ? String(androidFlaskJob.id) : null,
    };

    console.log('Job IDs:', JSON.stringify(result, null, 2));
    if (androidJob) console.log(`✓ Found Android job: "${androidJob.name}" (ID: ${androidJob.id})`);
    if (iosJob) console.log(`✓ Found iOS job: "${iosJob.name}" (ID: ${iosJob.id})`);
    if (androidFlaskJob) console.log(`✓ Found Android Flask job: "${androidFlaskJob.name}" (ID: ${androidFlaskJob.id})`);
    return result;
  } catch (error) {
    console.error('Error fetching jobs from GitHub API:', error);
    return { androidJobId: null, iosJobId: null, androidFlaskJobId: null };
  }
}

/**
 * Fetches artifact URLs from GitHub Actions API for a given workflow run
 * This function retrieves artifacts from the current workflow run, which includes
 * artifacts uploaded by reusable workflows (build-android-e2e.yml and build-ios-e2e.yml)
 * @param {Octokit} octokit - Octokit instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {number} runId - Workflow run ID (from github.run_id)
 * @returns {Promise<{ios: string | null, android: string | null, androidFlask: string | null}>} Object with artifact URLs
 */
async function fetchArtifactUrls(octokit, owner, repo, runId) {
  try {
    console.log(`Fetching artifacts for workflow run: ${runId}`);
    // Use paginate to handle workflows with more than 30 artifacts
    const allArtifacts = await octokit.paginate(octokit.rest.actions.listWorkflowRunArtifacts, {
      owner,
      repo,
      run_id: runId,
    });

    console.log(`Found ${allArtifacts.length} total artifacts in workflow run ${runId}`);
    console.log('Available artifact names:', allArtifacts.map((a) => a.name).join(', '));

    let iosArtifactId = null;
    let androidArtifactId = null;
    let androidFlaskArtifactId = null;

    // Find iOS artifact (MetaMask.app) - exact match required
    const iosArtifact = allArtifacts.find((artifact) => artifact.name === 'MetaMask.app');
    if (iosArtifact) {
      iosArtifactId = iosArtifact.id;
      console.log(`✓ Found iOS artifact: "${iosArtifact.name}" (ID: ${iosArtifactId}, Size: ${iosArtifact.size_in_bytes} bytes)`);
    } else {
      console.log('✗ No iOS artifact found matching "MetaMask.app"');
    }

    // Find Android artifacts
    // Artifact names follow pattern: {build_type}-{environment}-release.apk
    // Examples: main-e2e-release.apk, flask-e2e-release.apk
    const androidArtifacts = allArtifacts.filter(
      (artifact) =>
        artifact.name.includes('-release.apk') ||
        artifact.name.includes('-release.aab'),
    );

    console.log(`Found ${androidArtifacts.length} potential Android artifacts:`, androidArtifacts.map((a) => a.name).join(', '));

    // Find main Android artifact (main-e2e-release.apk)
    // Priority: exact match > APK (excluding test/flask) > AAB (excluding flask)
    // Use case-insensitive matching for exclusions
    const androidArtifact = androidArtifacts.find((a) => a.name === 'main-e2e-release.apk') ||
      androidArtifacts.find((a) => {
        const nameLower = a.name.toLowerCase();
        return a.name.includes('-release.apk') && !nameLower.includes('androidtest') && !nameLower.includes('flask');
      }) ||
      androidArtifacts.find((a) => {
        const nameLower = a.name.toLowerCase();
        return a.name.includes('-release.aab') && !nameLower.includes('flask') && !nameLower.includes('androidtest');
      });

    if (androidArtifact) {
      androidArtifactId = androidArtifact.id;
      console.log(`✓ Found Android artifact: "${androidArtifact.name}" (ID: ${androidArtifactId}, Size: ${androidArtifact.size_in_bytes} bytes)`);
    } else {
      console.log('✗ No Android artifact found matching expected patterns');
    }

    // Find Android Flask artifact (flask-e2e-release.apk)
    const androidFlaskArtifact = androidArtifacts.find((a) => a.name === 'flask-e2e-release.apk') ||
      androidArtifacts.find((a) => {
        const nameLower = a.name.toLowerCase();
        return nameLower.includes('flask') && a.name.includes('-release.apk');
      });

    if (androidFlaskArtifact) {
      androidFlaskArtifactId = androidFlaskArtifact.id;
      console.log(`✓ Found Android Flask artifact: "${androidFlaskArtifact.name}" (ID: ${androidFlaskArtifactId}, Size: ${androidFlaskArtifact.size_in_bytes} bytes)`);
    } else {
      console.log('✗ No Android Flask artifact found');
    }

    const baseUrl = `https://github.com/${owner}/${repo}/actions/runs/${runId}`;
    const result = {
      ios: iosArtifactId ? `${baseUrl}/artifacts/${iosArtifactId}` : null,
      android: androidArtifactId ? `${baseUrl}/artifacts/${androidArtifactId}` : null,
      androidFlask: androidFlaskArtifactId ? `${baseUrl}/artifacts/${androidFlaskArtifactId}` : null,
    };

    console.log('Artifact URLs:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error fetching artifacts from GitHub API:', error);
    if (error.status === 404) {
      console.error(`Workflow run ${runId} not found. This might happen if the run was deleted or doesn't exist.`);
    } else if (error.status === 403) {
      console.error('Permission denied. Ensure the GITHUB_TOKEN has "actions: read" permission.');
    }
    return { ios: null, android: null, androidFlask: null };
  }
}

/**
 * Posts or updates a PR comment with build artifacts links.
 * Requires environment variables: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, GITHUB_RUN_ID,
 * ANDROID_BUILD_SUCCESS, IOS_BUILD_SUCCESS, ANDROID_FLASK_BUILD_SUCCESS
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
    ANDROID_FLASK_BUILD_SUCCESS,
  } = process.env;

  // Validate required environment variables
  // Check for both undefined and empty string values
  if (!GITHUB_TOKEN?.trim() || !GITHUB_REPOSITORY?.trim() || !PR_NUMBER?.trim() || !GITHUB_RUN_ID?.trim()) {
    console.error(
      'Missing or empty required environment variables: GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, GITHUB_RUN_ID',
    );
    process.exit(1);
  }

  const [owner, repo] = GITHUB_REPOSITORY.split('/');
  if (!owner || !repo) {
    console.error(`GITHUB_REPOSITORY must be in format owner/repo, got: ${GITHUB_REPOSITORY}`);
    process.exit(1);
  }

  // Validate GITHUB_RUN_ID is a valid integer
  const runIdInt = parseInt(GITHUB_RUN_ID, 10);
  if (isNaN(runIdInt) || runIdInt <= 0) {
    console.error(`GITHUB_RUN_ID must be a valid positive integer, got: ${GITHUB_RUN_ID}`);
    process.exit(1);
  }

  // Validate PR_NUMBER before creating API client
  const prNumber = parseInt(PR_NUMBER, 10);
  if (isNaN(prNumber) || prNumber <= 0) {
    console.error(`PR_NUMBER must be a positive integer, got: ${PR_NUMBER}`);
    process.exit(1);
  }

  const octokit = new Octokit({ auth: GITHUB_TOKEN });

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
          console.warn(
            'Multiple different CURRENT_PROJECT_VERSION values found in project.pbxproj:',
            Array.from(uniqueVersions),
          );
        }

        iosBuildNumber = versions[0];
      }
    } else {
      console.warn(`iOS project file not found at ${pbxprojPath}`);
    }
  } catch (error) {
    console.error('Error reading iOS build number:', error);
  }

  // 2. Extract Android Version Code
  let androidVersionCode = 'Unknown';
  try {
    const buildGradlePath = path.resolve(__dirname, '../android/app/build.gradle');

    if (fs.existsSync(buildGradlePath)) {
      const buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');

      // Extract versionCode from defaultConfig block
      // Pattern: versionCode 2993 (can be on same line or separate)
      const versionCodeMatch = buildGradleContent.match(/versionCode\s+(\d+)/);

      if (versionCodeMatch) {
        androidVersionCode = versionCodeMatch[1];
        console.log(`Found Android versionCode: ${androidVersionCode}`);
      } else {
        console.warn('No versionCode found in build.gradle');
      }
    } else {
      console.warn(`Android build.gradle file not found at ${buildGradlePath}`);
    }
  } catch (error) {
    console.error('Error reading Android version code:', error);
  }

  // 3. Fetch job IDs and artifact URLs from GitHub API for the current workflow run
  // Note: GITHUB_RUN_ID refers to the main CI workflow run, which includes
  // artifacts from reusable workflows (build-android-e2e.yml and build-ios-e2e.yml)
  console.log(`\n=== Fetching jobs and artifacts for PR #${prNumber}, Workflow Run: ${runIdInt} ===`);
  const defaultArtifactsUrl = `https://github.com/${owner}/${repo}/actions/runs/${runIdInt}`;
  const workflowRunUrl = defaultArtifactsUrl;

  const [jobIds, artifactUrls] = await Promise.all([
    fetchJobIds(octokit, owner, repo, runIdInt),
    fetchArtifactUrls(octokit, owner, repo, runIdInt),
  ]);

  // Construct job URLs
  const androidJobUrl = jobIds.androidJobId
    ? `${workflowRunUrl}/job/${jobIds.androidJobId}`
    : null;
  const iosJobUrl = jobIds.iosJobId
    ? `${workflowRunUrl}/job/${jobIds.iosJobId}`
    : null;
  const androidFlaskJobUrl = jobIds.androidFlaskJobId
    ? `${workflowRunUrl}/job/${jobIds.androidFlaskJobId}`
    : null;

  // Use fetched URLs or fallback to run page (artifacts section)
  const iosUrl = artifactUrls.ios || defaultArtifactsUrl;
  const androidUrl = artifactUrls.android || defaultArtifactsUrl;
  const androidFlaskUrl = artifactUrls.androidFlask || defaultArtifactsUrl;

  console.log(`\n=== Artifact URLs ===`);
  console.log(`iOS: ${iosUrl}`);
  console.log(`Android: ${androidUrl}`);
  console.log(`Android Flask: ${androidFlaskUrl}`);
  console.log(`\n=== Job URLs ===`);
  console.log(`Android Job: ${androidJobUrl || 'Not found'}`);
  console.log(`iOS Job: ${iosJobUrl || 'Not found'}`);
  console.log(`Android Flask Job: ${androidFlaskJobUrl || 'Not found'}`);

  // 4. Construct Comment Body
  const rows = [];

  if (IOS_BUILD_SUCCESS === 'true') {
    rows.push(`| **iOS** | [Download Artifacts](${iosUrl}) | Build: \`${iosBuildNumber}\` |`);
  }

  if (ANDROID_BUILD_SUCCESS === 'true') {
    rows.push(`| **Android** | [Download Artifacts](${androidUrl}) | Build: \`${androidVersionCode}\` |`);
  }

  if (ANDROID_FLASK_BUILD_SUCCESS === 'true') {
    rows.push(`| **Android Flask** | [Download Artifacts](${androidFlaskUrl}) | Build: \`${androidVersionCode}\` |`);
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
        <summary>More Info</summary>

        *   **Workflow Run**: [\`${runIdInt}\`](${workflowRunUrl})
*   **iOS Build Number**: \`${iosBuildNumber}\`
*   **Android Version Code**: \`${androidVersionCode}\`
*   **iOS Build Job**: ${iosJobUrl ? `[View Job](${iosJobUrl})` : 'Not found'}
*   **Android Build Job**: ${androidJobUrl ? `[View Job](${androidJobUrl})` : 'Not found'}
*   **Android Flask Build Job**: ${androidFlaskJobUrl ? `[View Job](${androidFlaskJobUrl})` : 'Not found'}
</details>
`;

  // 5. Post or Update Comment
  // This ensures that if new artifacts are created in the same PR (e.g., after a new commit),
  // the comment will be updated with the latest artifact URLs
  try {
    console.log(`\n=== Searching for existing comment on PR #${prNumber} ===`);
    const comments = await octokit.paginate(octokit.rest.issues.listComments, {
      owner,
      repo,
      issue_number: prNumber,
    });

    console.log(`Found ${comments.length} total comments on PR #${prNumber}`);

    const existingComment = comments.find(
      (comment) => comment.body && comment.body.includes(ARTIFACTS_COMMENT_MARKER),
    );

    if (existingComment) {
      console.log(`✓ Found existing bot comment (ID: ${existingComment.id}). Updating with latest artifacts...`);
      await octokit.rest.issues.updateComment({
        owner,
        repo,
        comment_id: existingComment.id,
        body: commentBody,
      });
      console.log(`✓ Successfully updated comment with latest artifact URLs`);
    } else {
      console.log('No existing bot comment found. Creating new comment...');
      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: commentBody,
      });
      console.log(`✓ Successfully created new comment with artifact URLs`);
    }
  } catch (error) {
    console.error('Error posting/updating comment:', error);
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

