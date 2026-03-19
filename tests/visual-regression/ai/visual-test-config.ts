export interface VisualTestScreenConfig {
  testName: string;
  elements: string[];
  promptRules: string[];
  stabilityWait?: number;
}

export const PREDEFINED_CONFIGS = {
  WALLET_HOME: {
    testName: 'Wallet Home',
    elements: [
      'account name and identicon at top',
      'total portfolio balance',
      'action buttons row (buy, send, swap, bridge)',
      'token list with token names and balances',
      'bottom tab bar (wallet, explore, actions, activity)',
      'network indicator',
    ],
    promptRules: [
      'Portfolio balance dollar amount is dynamic — acceptable variation',
      'Individual token fiat values are dynamic — acceptable variation',
      'Token counts and symbols MUST match baseline (these are fixture-seeded)',
      'All tab bar icons must be present and correctly highlighted',
      'Action buttons (buy, send, swap, bridge) must all be present',
    ],
    stabilityWait: 3000,
  } satisfies VisualTestScreenConfig,

  SEND_CONFIRMATION: {
    testName: 'Send Confirmation',
    elements: [
      'recipient address (truncated)',
      'send amount and token symbol',
      'estimated network/gas fee',
      'total transaction cost',
      'confirm button',
      'cancel/reject button',
    ],
    promptRules: [
      'CRITICAL: Token symbol and send amount MUST match baseline exactly',
      'Gas/network fee dollar amount is dynamic — acceptable variation',
      'Recipient address MUST match baseline exactly',
      'Both confirm and cancel buttons must be present and tappable',
    ],
    stabilityWait: 3000,
  } satisfies VisualTestScreenConfig,
} as const;

export const createTestConfig = {
  walletHome: (
    overrides?: Partial<VisualTestScreenConfig>,
  ): VisualTestScreenConfig => ({
    ...PREDEFINED_CONFIGS.WALLET_HOME,
    ...overrides,
  }),

  sendConfirmation: (
    overrides?: Partial<VisualTestScreenConfig>,
  ): VisualTestScreenConfig => ({
    ...PREDEFINED_CONFIGS.SEND_CONFIRMATION,
    ...overrides,
  }),
};
