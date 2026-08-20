import { selectShouldShowWalletHomeOnboardingSteps } from '../../../../selectors/onboarding';
import { selectAccountGroupBalanceForEmptyState } from '../../../../selectors/assets/balances';
import { selectEvmChainId } from '../../../../selectors/networkController';
import { TEST_NETWORK_IDS } from '../../../../constants/network';
import { selectHasWalletFundingPrimaryCta } from './homePrimaryCta';

jest.mock('../../../../selectors/onboarding', () => ({
  selectShouldShowWalletHomeOnboardingSteps: jest.fn(),
}));
jest.mock('../../../../selectors/assets/balances', () => ({
  selectAccountGroupBalanceForEmptyState: jest.fn(),
}));
jest.mock('../../../../selectors/networkController', () => ({
  selectEvmChainId: jest.fn(),
}));

const mockOnboarding = jest.mocked(selectShouldShowWalletHomeOnboardingSteps);
const mockAggregatedBalance = jest.mocked(
  selectAccountGroupBalanceForEmptyState,
);
const mockChainId = jest.mocked(selectEvmChainId);

type AggregatedBalance = ReturnType<
  typeof selectAccountGroupBalanceForEmptyState
>;

const MAINNET = '0x1' as `0x${string}`;
const TESTNET = TEST_NETWORK_IDS[0];

const ZERO_BALANCE = {
  walletId: 'wallet-1',
  groupId: 'entropy:wallet-1/group-1',
  totalBalanceInUserCurrency: 0,
  userCurrency: 'usd',
} as AggregatedBalance;
const FUNDED_BALANCE = {
  ...ZERO_BALANCE,
  totalBalanceInUserCurrency: 12.34,
} as AggregatedBalance;

const state = {} as never;

describe('selectHasWalletFundingPrimaryCta', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    selectHasWalletFundingPrimaryCta.clearCache();
    mockOnboarding.mockReturnValue(false);
    mockAggregatedBalance.mockReturnValue(FUNDED_BALANCE);
    mockChainId.mockReturnValue(MAINNET);
  });

  it('is true while the onboarding checklist is visible', () => {
    mockOnboarding.mockReturnValue(true);

    expect(selectHasWalletFundingPrimaryCta(state)).toBe(true);
  });

  it('is true when the aggregated mainnet balance is zero (empty-state NBA showing)', () => {
    mockAggregatedBalance.mockReturnValue(ZERO_BALANCE);

    expect(selectHasWalletFundingPrimaryCta(state)).toBe(true);
  });

  it('is false when the wallet is funded and onboarding is done', () => {
    expect(selectHasWalletFundingPrimaryCta(state)).toBe(false);
  });

  it('is false on a testnet even when the aggregated balance is zero', () => {
    mockAggregatedBalance.mockReturnValue(ZERO_BALANCE);
    mockChainId.mockReturnValue(TESTNET);

    expect(selectHasWalletFundingPrimaryCta(state)).toBe(false);
  });

  it('is false when the aggregated balance is unavailable and onboarding is done', () => {
    mockAggregatedBalance.mockReturnValue(null);

    expect(selectHasWalletFundingPrimaryCta(state)).toBe(false);
  });
});
