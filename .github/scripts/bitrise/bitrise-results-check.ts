
import {printTime, removeLabel, getLatestAssociatedBitriseComment, determineE2ERunFlags, shouldRunBitriseE2E, getBitriseTestStatus, BitriseTestStatus, getRecentCommits} from './bitrise-utils';
import * as core from '@actions/core';
import {context} from '@actions/github';
async function main(): Promise<void> {

    printTime();

    console.log(`Workflow triggered actor : ${process.env.GITHUB_ACTOR}`);
    console.log(`Workflow triggered by:  ${context.eventName}`);


    // Determine the E2E run flags
    const flags = await determineE2ERunFlags();

    console.log(`Docs: ${flags.isDocs}`);
    console.log(`Fork: ${flags.isFork}`);
    console.log(`Merge Queue: ${flags.isMQ}`);
    console.log(`Has smoke test label: ${flags.hasSmokeTestLabel}`);

    const [shouldRun, reason] = shouldRunBitriseE2E(flags);
    console.log(`Should run: ${shouldRun}, Reason: ${reason}`);

    // fast exit for MQ PRs
    if (flags.isMQ) {
        console.log(`Skipping E2E result evaluation. Reason: Merge Queue PR.`);
        return;
    }

    // Consume the label
    await removeLabel("bitrise-result-ready");

    // Get the commit hash from the GitHub context
    const recentCommits = await getRecentCommits();
    console.log(`Recent commits: ${recentCommits}`);


    // If the E2E tests should run, check the Bitrise test status
    if (shouldRun) {

        // Get the Bitrise comment for the commit
        const bitriseComment = await getLatestAssociatedBitriseComment(recentCommits);

        // If no Bitrise comment is found, set the status to not found
        if (!bitriseComment) {
            console.log(`No Bitrise comment found for the recent commits.`);
            core.setFailed(`No Bitrise comment found for the recent commits.`);
            return;
        }
        
        const associatedCommit = bitriseComment.commitSha
        const status = await getBitriseTestStatus(bitriseComment);

        switch (status) {
            case BitriseTestStatus.Pending:
                const pendingMessage = `Bitrise test is still pending for the commit ${associatedCommit}.`;
                console.log(pendingMessage);
                core.setFailed(pendingMessage);
                break;
            case BitriseTestStatus.Success:
                const successMessage = `Bitrise test succeeded for the commit ${associatedCommit}.`;
                console.log(successMessage);
                core.setOutput("bitriseteststatus", "success");
                break;
            case BitriseTestStatus.Failure:
                const failureMessage = `Bitrise test failed for the commit ${associatedCommit}.`;
                console.log(failureMessage);
                core.setFailed(failureMessage);
                break;
            case BitriseTestStatus.NotFound:
                const notFoundMessage = `No Bitrise comment found for the commit ${associatedCommit}. Apply the E2E label to the PR for the latest commit to generate a bitrise comment/status.`;
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
