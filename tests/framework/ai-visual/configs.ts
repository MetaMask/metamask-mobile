import type { PromptMode } from './prompt';

export interface VisualTestConfig {
  testName: string;
  elements: string[];
  promptRules: string[];
  mode: PromptMode;
  waitConditions: string[];
  stabilityWait: number;
}

type ConfigOverrides = Partial<VisualTestConfig>;

const PREDEFINED: Record<string, VisualTestConfig> = {
  WALLET_HOME: {
    testName: 'Wallet Home',
    elements: [
      'account name and identicon/avatar in the header',
      'total balance display',
      'send, receive, and swap action buttons',
      'tokens tab and NFTs tab',
      'bottom navigation bar (wallet, browser, activity, settings)',
    ],
    promptRules: [
      'Balance value is dynamic — differences in balance are acceptable variations.',
      'Focus on presence and layout of action buttons, tabs, and navigation.',
    ],
    mode: 'baseline',
    waitConditions: [],
    stabilityWait: 2000,
  },

  SEND_CONFIRMATION: {
    testName: 'Send Confirmation',
    elements: [
      'transaction amount and token symbol',
      'token icon',
      'from/to account information',
      'network fee/gas information',
      'confirm button',
      'cancel/reject option',
    ],
    promptRules: [
      'CRITICAL: The token name, amount, and icon must match the baseline. A different token is a REGRESSION.',
      'CRITICAL: Every icon or logo visible in the baseline must also appear in the current screenshot.',
      'Network fee / gas fee values are dynamic — differences in fee values are acceptable variations only.',
    ],
    mode: 'baseline',
    waitConditions: ['network fee', 'gas fee'],
    stabilityWait: 3000,
  },

  TOKEN_OVERVIEW: {
    testName: 'Token Overview',
    elements: [
      'token name and symbol in header',
      'token balance and fiat value',
      'price chart or placeholder',
      'send and receive action buttons',
      "today's change indicator",
    ],
    promptRules: [
      'Token balance and fiat value are dynamic — differences are acceptable variations.',
      'Chart data points are dynamic — differences in chart shape are acceptable variations.',
      'CRITICAL: Token name and symbol must match the baseline.',
    ],
    mode: 'baseline',
    waitConditions: [],
    stabilityWait: 2000,
  },

  SWAP_REVIEW: {
    testName: 'Swap Review',
    elements: [
      'source token selector with icon and name',
      'destination token selector with icon and name',
      'amount input field',
      'swap direction arrow or flip button',
      'review/swap button',
    ],
    promptRules: [
      'Token balance values shown next to selectors are dynamic — differences are acceptable variations.',
      'Token prices and USD equivalents are dynamic — differences are acceptable variations.',
      'Exchange rate values (e.g. "1 ETH = 2,054 USDC") are dynamic — differences are acceptable variations.',
      'Rate countdown timer (e.g. "0:30", "0:15", "0:00") is dynamic — differences are acceptable variations.',
      'CRITICAL: The overall swap interface layout must match the baseline.',
      'WARNING: If the swap/confirm button shows "Insufficient gas" or "Insufficient funds" and is disabled, report this as a WARNING (not a regression) — the test wallet may lack funds. Any OTHER change to the button text or state IS a regression.',
      'CRITICAL: If the button text has changed to anything other than an insufficient funds/gas message compared to the baseline, this IS a REGRESSION.',
    ],
    mode: 'baseline',
    waitConditions: [],
    stabilityWait: 3000,
  },

  ONBOARDING_WELCOME: {
    testName: 'Onboarding Welcome',
    elements: [
      'MetaMask logo or icon',
      'welcome title text',
      'create new wallet button',
      'import existing wallet button',
    ],
    promptRules: [
      'CRITICAL: Both create and import buttons must be present.',
      'CRITICAL: MetaMask branding must be visible.',
    ],
    mode: 'baseline',
    waitConditions: [],
    stabilityWait: 1000,
  },

  LOGIN: {
    testName: 'Login Screen',
    elements: [
      'password input field',
      'unlock/login button',
      'biometric login option (if present)',
      'MetaMask logo or branding',
    ],
    promptRules: [
      'Biometric option availability may vary — presence or absence is an acceptable variation.',
      'CRITICAL: Password field and unlock button must be present.',
    ],
    mode: 'baseline',
    waitConditions: [],
    stabilityWait: 1000,
  },

  SIGNATURE_REQUEST: {
    testName: 'Signature Request',
    elements: [
      'account name in header',
      'signature request title',
      'message body content',
      'request origin URL',
      'cancel and confirm buttons',
    ],
    promptRules: [
      'CRITICAL: The message body text must match the baseline exactly.',
      'CRITICAL: The request origin URL must match the baseline.',
      'CRITICAL: Both cancel and confirm buttons must be present.',
    ],
    mode: 'baseline',
    waitConditions: [],
    stabilityWait: 2000,
  },

  NETWORK_SELECTOR: {
    testName: 'Network Selector',
    elements: [
      'network list with icons',
      'selected network indicator',
      'search or add network option',
      'network names',
    ],
    promptRules: [
      'Network names and ordering must match baseline.',
      'Selected network indicator must be clearly visible.',
    ],
    mode: 'baseline',
    waitConditions: [],
    stabilityWait: 1000,
  },
};

function withOverrides(
  base: VisualTestConfig,
  overrides: ConfigOverrides,
): VisualTestConfig {
  return { ...base, ...overrides };
}

export const createTestConfig = {
  walletHome: (overrides: ConfigOverrides = {}) =>
    withOverrides(PREDEFINED.WALLET_HOME, overrides),

  sendConfirmation: (overrides: ConfigOverrides = {}) =>
    withOverrides(PREDEFINED.SEND_CONFIRMATION, overrides),

  tokenOverview: (overrides: ConfigOverrides = {}) =>
    withOverrides(PREDEFINED.TOKEN_OVERVIEW, overrides),

  swapReview: (overrides: ConfigOverrides = {}) =>
    withOverrides(PREDEFINED.SWAP_REVIEW, overrides),

  onboardingWelcome: (overrides: ConfigOverrides = {}) =>
    withOverrides(PREDEFINED.ONBOARDING_WELCOME, overrides),

  login: (overrides: ConfigOverrides = {}) =>
    withOverrides(PREDEFINED.LOGIN, overrides),

  signatureRequest: (overrides: ConfigOverrides = {}) =>
    withOverrides(PREDEFINED.SIGNATURE_REQUEST, overrides),

  networkSelector: (overrides: ConfigOverrides = {}) =>
    withOverrides(PREDEFINED.NETWORK_SELECTOR, overrides),
};
