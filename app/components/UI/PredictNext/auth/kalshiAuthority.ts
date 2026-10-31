/**
 * `@authority` the phone signs for Kalshi demo. Requests still go to
 * `external-api.demo.kalshi.co`, but Kalshi compares the signature with this
 * configured value (predict-api KALSHI_DEMO_ONBOARDING_PLAN.md §10.1). It is
 * a build constant, not a remote flag, so a flag flip cannot retarget
 * signatures. Production has no value until Kalshi confirms one.
 */
export const KALSHI_DEMO_AUTHORITY = 'demo-api.kalshi.co';
