
import {getCommitHash, getOctokitInstance, getBitriseCommentForCommit, determineE2ERunFlags, shouldRunBitriseE2E, getBitriseTestStatus, BitriseTestStatus} from './bitrise-utils';
import * as core from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { GitHub } from '@actions/github/lib/utils';
import {
    CompletedConclusionType,
    PullRequestTriggerType,
    StatusCheckStatusType,
  } from '../scripts.types';

async function main(): Promise<void> {

    // Get the commit hash from the GitHub context
    const commitHash = await getCommitHash();
    // Determine the E2E run flags
    const flags = await determineE2ERunFlags();

    console.log(`Docs: ${flags.isDocs}`);
    console.log(`Fork: ${flags.isFork}`);
    console.log(`Merge Queue: ${flags.isMQ}`);
    console.log(`Has smoke test label: ${flags.hasSmokeTestLabel}`);
    console.log(`Anti label: ${flags.hasAntiLabel}`);

    const [shouldRun, reason] = shouldRunBitriseE2E(flags);
    console.log(`Should run: ${shouldRun}, Reason: ${reason}`);

    // If the E2E tests should run, check the Bitrise test status
    if (shouldRun) {

        // Get the Bitrise comment for the commit
        const status = await getBitriseTestStatus(commitHash);

        switch (status) {
            case BitriseTestStatus.Pending:
                const pendingMessage = `Bitrise test is still pending for the commit ${commitHash}.`;
                console.log(pendingMessage);
                core.setFailed(pendingMessage);
                break;
            case BitriseTestStatus.Success:
                const successMessage = `Bitrise test succeeded for the commit ${commitHash}.`;
                console.log(successMessage);
                core.setOutput("bitriseteststatus", "success");
                break;
            case BitriseTestStatus.Failure:
                const failureMessage = `Bitrise test failed for the commit ${commitHash}.`;
                console.log(failureMessage);
                core.setFailed(failureMessage);
                break;
            case BitriseTestStatus.NotFound:
                const notFoundMessage = `No Bitrise comment found for the commit ${commitHash}. Apply the E2E label to the PR for the latest commit to generate a bitrise comment/status.`;
                console.log(notFoundMessage);
                core.setFailed(notFoundMessage);
                break;
        }
    } else {
        console.log(`Skipping E2E result evaluation. Reason: ${reason}`);
        return;
    }
  }

  main().catch((error: Error): void => {
    console.error(error);
    process.exit(1);
  });