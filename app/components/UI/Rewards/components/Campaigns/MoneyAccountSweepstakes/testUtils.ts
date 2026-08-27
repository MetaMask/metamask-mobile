import type { MoneyAccountSweepstakesLocalizedTextDto } from '../../../../../../core/Engine/controllers/rewards-controller/types';

/** Shared fixture matching backend DEFAULT_MONEY_ACCOUNT_SWEEPSTAKES_LOCALIZED_TEXT. */
export const createMoneyAccountSweepstakesLocalizedText = (
  overrides: Partial<MoneyAccountSweepstakesLocalizedTextDto> = {},
): MoneyAccountSweepstakesLocalizedTextDto => ({
  eligibleBalanceTitle: 'Qualifying deposits',
  eligibleBalanceDescription:
    "Net new deposits in your Money Account since you joined. Reach $100 and don't drop below it before midnight UTC to earn today's entry. Balance from before joining doesn't count.",
  entriesTitle: 'Entries',
  entriesDescription:
    'One entry for each UTC day your qualifying deposits stayed at $100 or above. Max 7 per week.',
  entriesCountValue: '{count} / 7',
  drawScheduleTitle: 'Draw schedule',
  drawScheduleSummary: '4 weekly draws · 2 winners each',
  drawScheduleCurrentDraw: 'Current draw',
  drawScheduleEntriesReset: 'Entries reset after each weekly draw.',
  drawScheduleViewResults: 'View draw results',
  awardedLabel: 'Awarded',
  prizePoolLabel: 'Prize pool',
  prizeTitle: 'Win up to $2,500 mUSD',
  prizeDescription: '2 winners weekly · 4 weeks',
  addFundsTitle: 'Add funds',
  addFundsNoBalanceTitle: 'No balance to deposit into Money Account',
  addFundsNoBalanceDescription:
    'Deposit crypto or mUSD in your wallet before transferring them to Money Account.',
  weekTitle: 'Week {number}',
  completeLabel: 'Complete',
  activeLabel: 'Active',
  joinTheSweepstakesTitle: 'Join the Sweepstakes',
  drawPendingTitle: 'Draw pending',
  drawCompleteTitle: 'Winners drawn',
  drawProofTitle: 'Draw proof',
  merkleRootLabel: 'Merkle root',
  formulaLabel: 'Formula',
  drawFormulaLabel: 'Weighted raffle (Efraimidis–Spirakis)',
  drawFormulaDescription:
    "Each day your qualifying deposits stayed at $100 or above earned an entry (counted from the day you joined). After the week ended, we locked everyone's entries and published a commitment (the Merkle root) before the random seed existed. The seed is a future block hash nobody can predict. We then run a weighted raffle: more entries improve your odds but don't guarantee a win. Anyone can re-check the commitment, seed, and formula to verify the ranking.",
  seedBlockLabel: 'Seed block number',
  seedBlockHashLabel: 'Seed block hash',
  drawProofEntriesLabel: 'Entries',
  winnersLabel: 'Winners',
  reservesLabel: 'Reserves',
  originalDrawTitle: 'Original draw',
  reserveSuffix: '(reserve)',
  refLabel: 'Ref',
  weightLabel: 'Weight',
  bindingConflictTitle: 'Money Account already linked',
  bindingConflictDescription:
    'Money Account already binds to another Rewards profile.',
  onTrackDescription:
    "You're on track for today's entry. Keep at least $100 in your Money Account through the end of the day.",
  lostTodayDescription:
    "Today's entry is forfeit after dipping below $100. Get back to $100+ to earn again tomorrow.",
  shortfallDescription:
    "Add {amount} today to reach $100 and earn today's entry.",
  currentBalanceTitle: 'Money Account balance',
  balanceTitle: 'Balance',
  qualifiedLabel: 'Qualified',
  thisWeekLabel: 'this week',
  nextDrawTitle: 'Next draw',
  dayRemainingValue: '{count} day',
  daysRemainingValue: '{count} days',
  learnHowItWorksTitle: 'How it works',
  learnHowItWorksDescription: 'Learn how to earn entries',
  learnMusdTitle: 'MetaMask USD',
  learnMusdDescription: 'Learn more about mUSD',
  ...overrides,
});
