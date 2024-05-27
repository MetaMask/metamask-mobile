# Patching Core Packages Guide

This guide details the procedure for generating and applying patches to core packages within the `metamask-mobile` project.

## Prerequisites

- Ensure the latest versions of both the core and mobile repositories are cloned to your local machine.

### Patching Steps

1. **Setting Up the Core Repository:**

   - If the package you intend to patch has an existing patch in the mobile repository, refer to the initial comment within the patch file. It will indicate the branch from which the patch was created. For example, `+PATCH GENERATED FROM MetaMask/core branch: **patch/mobile-transaction-controller-13-0-0**`.

   - In your local core repository, switch to the branch mentioned in the patch file or create a new branch from it:

     ```
     git checkout patch/mobile-transaction-controller-13-0-0
     git checkout -b patch/mobile-transaction-controller-13-0-0-important-hotfix
     ```

   - Implement your changes on this new branch.
   - Execute `yarn build:clean` to eliminate any prior build artifacts and ensure a clean build. This step is essential to prevent the inclusion of extraneous files in the patch due to previous builds.

2. **Applying Your Changes to the Mobile Repository:**

   - Use the appropriate script to apply your patch, depending on the package you're modifying:

     - `yarn patch:tx <core-directory>`
     - `yarn patch:assets <core-directory>`
     - `yarn patch:approval <core-directory>`

     For instance, if `metamask-mobile` and the `core` package are in the same directory, the patch script would be `yarn patch:tx ../core`.

   - Include the updated patch file in your pull request (PR) and submit it to the mobile repository.

3. **Finalizing Your Mobile PR:**

   - Once your PR in the mobile repository is approved, create a PR against the existing patch branch in the core repository. Ensure your changes do not introduce any breaking changes to the patched package. If your update involves a major version change, remember to also update the patch branch and version references in the mobile repository.

4. **Merging Your PRs:**

   - After your PR in the mobile repository is merged, you can proceed to merge the PR you created against the patch branch in the core repository.

To maintain the `metamask-mobile` project's integrity and ensure it stays current with essential fixes and enhancements, it's crucial to manage and apply patches to core packages efficiently. However, it's worth noting that patching should be considered a last resort, reserved primarily for addressing security vulnerabilities or implementing high-priority features.
