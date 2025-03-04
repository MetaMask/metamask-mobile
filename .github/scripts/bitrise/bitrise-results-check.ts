
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
                console.log("Bitrise test is pending.");
                core.setFailed("Bitrise test is still pending.");
                break;
            case BitriseTestStatus.Success:
                console.log("Bitrise test succeeded.");
                core.setOutput("bitriseteststatus", "success");
                break;
            case BitriseTestStatus.Failure:
                console.log("Bitrise test failed.");
                core.setFailed("Bitrise test failed.");
                break;
            case BitriseTestStatus.NotFound:
                console.log("No Bitrise comment found for the commit.");
                core.setFailed("No Bitrise comment found for the commit.");
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