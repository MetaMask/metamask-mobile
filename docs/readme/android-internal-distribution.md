# Internal Android distribution

Share signed Android production APKs with teammates for **internal** testing

## Flow

1. Trigger **Build Android for internal distribution** with `source_branch`.
2. Workflow builds `main-prod` via Build Mobile App (`build.yml`).
3. Renames the APK to `MetaMask-{branch}.apk` and publishes it as a workflow artifact.
4. A distribution host bucket rule can auto-pull that workflow’s APK artifact when the run succeeds.
5. Job **Summary** links the public bucket and lists what to look for (filename, branch, commit).
