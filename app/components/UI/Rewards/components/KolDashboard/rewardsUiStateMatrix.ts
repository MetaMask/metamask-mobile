/**
 * UI-only state matrix for the KOL Rewards rework.
 *
 * These are presentation states engineers should wire to selectors later.
 * This draft only implements the Replit-covered “populated KOL” happy path
 * (plus a visual claim-to-zero on Earnings). Do not infer backend rules from
 * this list.
 */
export const KOL_REWARDS_UI_STATE_MATRIX = {
  waysToEarn: {
    implemented: ['populatedKol'],
    notInReplitDump: [
      'emptyReferralCode',
      'zeroRecordedEarnings',
      'noFeaturedCampaigns',
      'emptyBenefits',
      'loading',
      'error',
    ],
  },
  earningsTab: {
    implemented: ['populatedClaimable', 'claimedToZero'],
    notInReplitDump: ['zeroAvailable', 'emptyHistory', 'loading', 'error'],
  },
  shareCodeSheet: {
    implemented: ['openWithCodeAndQr'],
    notInReplitDump: ['missingReferralCode'],
  },
  performance: {
    implemented: ['populatedLast30Days'],
    notInReplitDump: ['emptyFunnel', 'emptyCommissions', 'loading', 'error'],
  },
  campaignEligibility: {
    note: 'Keep eligibility, enrollment, and daily qualification as separate campaign states. Not part of this KOL dashboard dump.',
    implemented: [],
    notInReplitDump: [
      'geoIneligible',
      'notEnrolled',
      'enrolledNotQualified',
      'qualified',
    ],
  },
} as const;
