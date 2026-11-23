import { act, renderHook } from '@testing-library/react-hooks';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import type { MoneyAccount } from '@metamask/money-account-controller';
import { selectPrimaryMoneyAccount } from '../../../../../selectors/moneyAccountController';
import {
  selectMoneyAccountVaultConfig,
  type MoneyAccountVaultConfig,
} from '../../../../../selectors/featureFlagController/moneyAccount';
import { getGasFeesSponsoredNetworkEnabled } from '../../../../../selectors/featureFlagController/gasFeesSponsored';
import Engine from '../../../../../core/Engine';
import { isHardwareAccount } from '../../../../../util/address';
import { runEarningsClaim } from '../../../Rewards/utils/claimEarnings';
import { useCardCashbackClaim } from './useCardCashbackClaim';

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../../selectors/moneyAccountController', () => ({
  selectPrimaryMoneyAccount: jest.fn(),
}));

jest.mock(
  '../../../../../selectors/featureFlagController/moneyAccount',
  () => ({
    selectMoneyAccountVaultConfig: jest.fn(),
  }),
);

jest.mock(
  '../../../../../selectors/featureFlagController/gasFeesSponsored',
  () => ({
    getGasFeesSponsoredNetworkEnabled: jest.fn(),
  }),
);

jest.mock('../../../../../core/Engine', () => ({
  context: {
    RewardsMoneyController: { initiateClaim: jest.fn() },
    KeyringController: { signPersonalMessage: jest.fn() },
  },
}));

jest.mock('../../../../../util/address', () => ({
  isHardwareAccount: jest.fn(() => false),
}));

jest.mock('../../../Rewards/utils/claimEarnings', () => {
  const actual = jest.requireActual('../../../Rewards/utils/claimEarnings');
  return {
    ...actual,
    runEarningsClaim: jest.fn(),
  };
});

const moneyAccount = {
  address: '0x2222222222222222222222222222222222222222',
  options: { entropy: { type: 'mnemonic' } },
} as MoneyAccount;

const vaultConfig = {
  chainId: CHAIN_IDS.MONAD,
  boringVault: '0x4444444444444444444444444444444444444444',
  tellerAddress: '0x5555555555555555555555555555555555555555',
  accountantAddress: '0x6666666666666666666666666666666666666666',
  lensAddress: '0x7777777777777777777777777777777777777777',
} as MoneyAccountVaultConfig;

function givenAccount({
  vault = vaultConfig,
  sponsored = true,
}: {
  vault?: MoneyAccountVaultConfig;
  sponsored?: boolean;
} = {}) {
  jest.mocked(selectPrimaryMoneyAccount).mockReturnValue(moneyAccount);
  jest.mocked(selectMoneyAccountVaultConfig).mockReturnValue(vault);
  jest
    .mocked(getGasFeesSponsoredNetworkEnabled)
    .mockReturnValue(() => sponsored);
}

describe('useCardCashbackClaim', () => {
  beforeEach(() => {
    jest.mocked(runEarningsClaim).mockReset();
  });

  it('does not offer a claim without a vault config', () => {
    jest.mocked(selectPrimaryMoneyAccount).mockReturnValue(moneyAccount);
    jest.mocked(selectMoneyAccountVaultConfig).mockReturnValue(undefined);
    jest.mocked(getGasFeesSponsoredNetworkEnabled).mockReturnValue(() => true);

    const { result } = renderHook(() => useCardCashbackClaim());

    expect(result.current.canClaim).toBe(false);
  });

  it('does not offer a claim when sponsorship is off', () => {
    givenAccount({ sponsored: false });

    const { result } = renderHook(() => useCardCashbackClaim());

    expect(result.current.canClaim).toBe(false);
  });

  it('starts one claim when pressed twice', async () => {
    givenAccount();
    let resolveClaim: (value: { submitted: boolean }[]) => void = () =>
      undefined;
    jest.mocked(runEarningsClaim).mockImplementation(
      async () =>
        new Promise((resolve) => {
          resolveClaim = resolve as typeof resolveClaim;
        }),
    );
    const { result } = renderHook(() => useCardCashbackClaim());
    let first: Promise<string> = Promise.resolve('skipped');
    let second: Promise<string> = Promise.resolve('skipped');

    act(() => {
      first = result.current.claim();
      second = result.current.claim();
    });

    expect(runEarningsClaim).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveClaim([{ submitted: true }]);
      await Promise.all([first, second]);
    });
    await expect(first).resolves.toBe('submitted');
    await expect(second).resolves.toBe('skipped');
  });

  it('reports a claim whose routes were not submitted', async () => {
    givenAccount();
    jest.mocked(runEarningsClaim).mockResolvedValue([
      {
        route: 'card-cashback',
        submitted: false,
        opened: false,
        reason: 'SIGN_FAILED',
      },
    ]);
    const { result } = renderHook(() => useCardCashbackClaim());
    let outcome = '';

    await act(async () => {
      outcome = await result.current.claim();
    });

    expect(outcome).toBe('failed');
  });

  it('holds the result when the refresh after a claim fails', async () => {
    givenAccount();
    jest.mocked(runEarningsClaim).mockResolvedValue([
      {
        route: 'card-cashback',
        submitted: true,
        opened: true,
      },
    ]);
    const { result } = renderHook(() =>
      useCardCashbackClaim(async () => {
        throw new Error('reload failed');
      }),
    );
    let outcome = '';

    await act(async () => {
      outcome = await result.current.claim();
    });

    expect(runEarningsClaim).toHaveBeenCalledTimes(1);
    expect(outcome).toBe('submitted_stale');
  });

  it('does not offer a claim for an account that cannot sign', async () => {
    jest.mocked(selectPrimaryMoneyAccount).mockReturnValue({
      address: '0x3333333333333333333333333333333333333333',
      options: { entropy: { type: 'privateKey' } },
    } as MoneyAccount);
    jest.mocked(selectMoneyAccountVaultConfig).mockReturnValue(vaultConfig);
    jest.mocked(getGasFeesSponsoredNetworkEnabled).mockReturnValue(() => true);

    const { result } = renderHook(() => useCardCashbackClaim());
    let outcome = '';

    await act(async () => {
      outcome = await result.current.claim();
    });

    expect(result.current.canClaim).toBe(false);
    expect(result.current.mpcAccount).toBe(true);
    expect(outcome).toBe('skipped');
    expect(runEarningsClaim).not.toHaveBeenCalled();
  });

  it('signs and submits the card-cashback route', async () => {
    givenAccount();
    const initiateClaim = Engine.context.RewardsMoneyController
      .initiateClaim as jest.Mock;
    const signPersonalMessage = Engine.context.KeyringController
      .signPersonalMessage as jest.Mock;
    initiateClaim.mockResolvedValue({ voucher: {} });
    signPersonalMessage.mockResolvedValue('0xsig');
    jest.mocked(runEarningsClaim).mockImplementation(async (input) => {
      await input.initiateClaim('card-cashback', {
        money_account_address: moneyAccount.address,
      });
      expect(
        input.canSignEarningAddress(`eip155:${moneyAccount.address}`),
      ).toBe(true);
      jest.mocked(isHardwareAccount).mockReturnValueOnce(true);
      expect(
        input.canSignEarningAddress(`eip155:${moneyAccount.address}`),
      ).toBe(false);
      expect(input.canSignEarningAddress('not-evm')).toBe(false);
      await expect(
        input.signMessage('hello', `eip155:${moneyAccount.address}`),
      ).resolves.toBe('0xsig');
      await expect(input.signMessage('hello', 'not-evm')).rejects.toThrow(
        'SIGN_FAILED',
      );
      signPersonalMessage.mockRejectedValueOnce(new Error('declined'));
      await expect(
        input.signMessage('hello', `eip155:${moneyAccount.address}`),
      ).rejects.toThrow('SIGN_FAILED');
      await expect(input.submitVoucher({} as never)).rejects.toThrow();
      return [{ route: 'card-cashback', submitted: true, opened: true }];
    });
    const { result } = renderHook(() => useCardCashbackClaim());
    let outcome = '';

    await act(async () => {
      outcome = await result.current.claim();
    });

    expect(initiateClaim).toHaveBeenCalledTimes(1);
    expect(outcome).toBe('submitted');
  });
});
