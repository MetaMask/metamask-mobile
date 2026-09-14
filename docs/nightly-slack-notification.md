## Nightly Slack Notification

Posts a daily summary of the nightly `main-exp` / `main-rc` builds (iOS + Android) to Slack, with the app version, each flavor's build number, and its Runway download link.

---

### How it works

- **Builds**: [`nightly-build.yml`](../.github/workflows/nightly-build.yml) runs on its existing schedule (`0 4 * * *`, 04:00 UTC) and is unchanged. Once `ios-exp`, `ios-rc`, `android-exp`, and `android-rc` all succeed, its `emit-nightly-metadata` job writes a `nightly-slack-meta` artifact (version + the four build numbers + the workflow run URL).
- **Notification**: [`nightly-slack-notification.yml`](../.github/workflows/nightly-slack-notification.yml) runs on its own schedule, `0 8 * * *` (08:00 UTC = **09:00 UTC+1**, year-round). It finds the latest successful `Nightly Build` run, downloads its `nightly-slack-meta` artifact, and runs [`scripts/slack-nightly-notification.mjs`](../scripts/slack-nightly-notification.mjs) to post the message.

This two-workflow split exists so the Slack message lands in the morning EU time instead of firing right after the ~04:00 UTC builds finish. GitHub cron does not observe DST: `08:00 UTC` is exactly 09:00 UTC+1 in winter (CET) and 10:00 in summer (CEST).

The Android/iOS download links are the public Runway bucket URLs in [`scripts/runway-public-buckets.mjs`](../scripts/runway-public-buckets.mjs) — not secrets, so update that file directly if Runway ever rotates a link. The release-candidates bucket used by [`scripts/slack-rc-notification.mjs`](../scripts/slack-rc-notification.mjs) (posted to `#release-mobile-<semver>` for open releases) lives in the same file.

Both notification steps fail open: if metadata is missing, the channel is misconfigured, or the Slack API call fails, the workflow logs a warning and exits successfully rather than failing CI.

### Required repo configuration

- Actions variable `SLACK_NIGHTLY_CHANNEL` — the nightly Slack channel name (e.g. `#nightly-mobile`) or channel ID. Uses the same `SLACK_BOT_TOKEN` secret as RC/production Slack.

### Testing

Dispatch `nightly-slack-notification.yml` manually with `dry_run: true` to print the Slack payload without posting, or `dry_run: false` to post for real against the current latest successful nightly run.

### One-time cutover steps (Runway bucket migration)

- [ ] Set the `SLACK_NIGHTLY_CHANNEL` repo variable.
- [ ] Confirm the first scheduled post (or a manual non-dry-run dispatch) lands correctly.
- [ ] Turn off the old nightly Slack automation (the one that posted static bucket/TestFlight links with no version or build number) so testers stop getting a duplicate, stale-link message at the same time of day.
- [ ] Delete the now-unused `ANDROID_PUBLIC_BUCKET_URL` GitHub secret — RC Slack (`slack-rc-notification.yml`) now defaults to the public constant in `scripts/runway-public-buckets.mjs` instead.
- [ ] Optional: if release PR comments (`scripts/build-announce`) should also link the Runway RC bucket instead of falling back to the CI pipeline link, pass `ANDROID_PUBLIC_URL` through explicitly in [`build-rc-auto.yml`](../.github/workflows/build-rc-auto.yml) — `scripts/build-announce/utils.ts` runs under `esbuild-register` (CommonJS) so it cannot `import`/`require` the `.mjs` constants module directly; the URL would need to be passed in as a plain string env var.
