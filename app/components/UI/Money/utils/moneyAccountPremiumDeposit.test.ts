import { SUBSCRIPTION_STATUSES } from '@metamask/subscription-controller';
import type { RootState } from '../../../../reducers';
import { selectMoneyAccountPremiumVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectMoneyAccountPlusSubscription } from '../../../../selectors/subscriptionController';
import { getVaultWhitelistSignature } from '../../../../util/transactions/sentinel-api';
import {
  isPremiumDepositCandidate,
  resolveMoneyAccountDepositVault,
} from './moneyAccountPremiumDeposit';

jest.mock('../../../../selectors/featureFlagController/moneyAccount');
jest.mock('../../../../selectors/subscriptionController');
jest.mock('../../../../util/transactions/sentinel-api');

const chainId = '0x8f';
const address = '0x1234000000000000000000000000000000000000';
const state = {} as RootState;
const selectConfig = jest.mocked(selectMoneyAccountPremiumVaultConfig);
const selectSubscription = jest.mocked(selectMoneyAccountPlusSubscription);
type PlusSubscription = NonNullable<ReturnType<typeof selectSubscription>>;
const activeSubscription = {
  status: SUBSCRIPTION_STATUSES.active,
} as PlusSubscription;
const getSignature = jest.mocked(getVaultWhitelistSignature);

beforeEach(() => {
  jest.resetAllMocks();
});

describe('isPremiumDepositCandidate', () => {
  beforeEach(() => {
    selectSubscription.mockReturnValue(activeSubscription);
    selectConfig.mockReturnValue({
      chainId,
      boringVault: '0x1',
      tellerAddress: '0x2',
      accountantAddress: '0x3',
      lensAddress: '0x4',
    });
  });

  it.each([
    [SUBSCRIPTION_STATUSES.active, true],
    [SUBSCRIPTION_STATUSES.trialing, true],
    [SUBSCRIPTION_STATUSES.provisional, true],
    [SUBSCRIPTION_STATUSES.pastDue, true],
    [SUBSCRIPTION_STATUSES.awaitingFunds, false],
    [SUBSCRIPTION_STATUSES.canceled, false],
  ])('treats Plus status %s as a premium candidate: %s', (status, expected) => {
    selectSubscription.mockReturnValue({ status } as PlusSubscription);

    const candidate = isPremiumDepositCandidate(state, chainId);

    expect(candidate).toBe(expected);
  });

  it('does not consider a deposit a candidate without a Plus subscription', () => {
    selectSubscription.mockReturnValue(undefined);

    const candidate = isPremiumDepositCandidate(state, chainId);

    expect(candidate).toBe(false);
  });

  it('does not consider a deposit a candidate without premium config', () => {
    selectConfig.mockReturnValue(undefined);

    const candidate = isPremiumDepositCandidate(state, chainId);

    expect(candidate).toBe(false);
  });

  it('does not consider a deposit on another chain a candidate', () => {
    const candidate = isPremiumDepositCandidate(state, '0x1');

    expect(candidate).toBe(false);
  });
});

describe('resolveMoneyAccountDepositVault', () => {
  it('returns the compliance signature for the exact settled amount', async () => {
    const authorization = {
      signature: '0x1234',
      deadline: 1800000000,
    } as const;
    getSignature.mockResolvedValue({ eligible: true, ...authorization });

    const result = await resolveMoneyAccountDepositVault(
      chainId,
      address,
      '123',
    );

    expect(getSignature).toHaveBeenCalledWith(chainId, address, '123');
    expect(result).toEqual({ recipient: address, ...authorization });
  });

  it('returns no authorization for an explicitly ineligible account', async () => {
    getSignature.mockResolvedValue({ eligible: false });

    const result = await resolveMoneyAccountDepositVault(
      chainId,
      address,
      '123',
    );

    expect(result).toBeUndefined();
  });

  it.each([undefined, '0x1234'])(
    'rejects a self-deposit from %s without asking Sentinel',
    async (recipient) => {
      const result = resolveMoneyAccountDepositVault(chainId, recipient, '123');

      await expect(result).rejects.toThrow(
        'Premium Deposit: Invalid Money Account address',
      );
      expect(getSignature).not.toHaveBeenCalled();
    },
  );

  it.each(['request failed', 'request timed out'])(
    'propagates a Sentinel failure when the %s',
    async (message) => {
      getSignature.mockRejectedValue(new Error(message));

      const result = resolveMoneyAccountDepositVault(chainId, address, '123');

      await expect(result).rejects.toThrow(`Premium Deposit: ${message}`);
    },
  );
});
