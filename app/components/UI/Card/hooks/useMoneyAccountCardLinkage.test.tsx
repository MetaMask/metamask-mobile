import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';
import { useSelector } from 'react-redux';
import { ToastContext } from '../../../../component-library/components/Toast';
import Logger from '../../../../util/Logger';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import {
  selectCardDelegationSettings,
  selectIsCardAuthenticated,
} from '../../../../selectors/cardController';
import { selectMoneyEnableMoneyAccountFlag } from '../../Money/selectors/featureFlags';
import { resolveMoneyAccountCardToken } from '../../../../core/Engine/controllers/card-controller/utils/moneyAccountCardToken';
import { BAANX_MAX_LIMIT } from '../constants';
import { FundingStatus } from '../types';
import { useMoneyAccountCardLinkage } from './useMoneyAccountCardLinkage';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockLinkMoneyAccountCard = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      CardController: {
        linkMoneyAccountCard: (...args: unknown[]) =>
          mockLinkMoneyAccountCard(...args),
      },
    },
  },
}));

jest.mock('./useCardDelegation', () => {
  class MockUserCancelledError extends Error {
    constructor(message = 'User cancelled') {
      super(message);
      this.name = 'UserCancelledError';
    }
  }
  return { UserCancelledError: MockUserCancelledError };
});

jest.mock(
  '../../../../core/Engine/controllers/card-controller/utils/moneyAccountCardToken',
  () => ({
    resolveMoneyAccountCardToken: jest.fn(),
    hasMoneyAccountCardRequirements: ({
      isMoneyAccountEnabled,
      vaultConfig,
      moneyAccountAddress,
    }: {
      isMoneyAccountEnabled: boolean;
      vaultConfig: unknown;
      moneyAccountAddress?: string | null;
    }) => Boolean(isMoneyAccountEnabled && vaultConfig && moneyAccountAddress),
  }),
);

jest.mock('../../../../util/Logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
}));

jest.mock('../../../../util/theme', () => {
  const actual = jest.requireActual('../../../../util/theme');
  return {
    ...actual,
    useTheme: jest.fn(() => actual.mockTheme),
  };
});

const mockUseMoneyAccountBalance = jest.fn();
jest.mock('../../Money/hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: () => mockUseMoneyAccountBalance(),
}));

const mockUseSelector = useSelector as unknown as jest.Mock;
const mockResolveMoneyAccountCardToken =
  resolveMoneyAccountCardToken as jest.Mock;

const MONEY_ACCOUNT_ADDRESS = '0x1234567890123456789012345678901234567890';

const MOCK_TOKEN = {
  address: '0xtoken',
  symbol: 'USDC',
  name: 'USDC',
  decimals: 6,
  caipChainId: 'eip155:11297108099' as `${string}:${string}`,
  fundingStatus: FundingStatus.NotEnabled,
  spendableBalance: '0',
  delegationContract: '0xdelegation',
};

const buildSelectors = (
  overrides: {
    primaryMoneyAccount?: { address: string } | undefined;
    vaultConfig?: unknown;
    isMoneyAccountEnabled?: boolean;
    isCardAuthenticated?: boolean;
    delegationSettings?: unknown;
  } = {},
) => ({
  primaryMoneyAccount: { address: MONEY_ACCOUNT_ADDRESS },
  vaultConfig: { id: 'vault-1' },
  isMoneyAccountEnabled: true,
  isCardAuthenticated: true,
  delegationSettings: { ok: true },
  ...overrides,
});

const applySelectorMocks = (state: ReturnType<typeof buildSelectors>) => {
  mockUseSelector.mockImplementation((selector: (s: unknown) => unknown) => {
    if (selector === selectPrimaryMoneyAccount)
      return state.primaryMoneyAccount;
    if (selector === selectMoneyAccountVaultConfig) return state.vaultConfig;
    if (selector === selectMoneyEnableMoneyAccountFlag)
      return state.isMoneyAccountEnabled;
    if (selector === selectIsCardAuthenticated)
      return state.isCardAuthenticated;
    if (selector === selectCardDelegationSettings)
      return state.delegationSettings;
    return undefined;
  });
};

describe('useMoneyAccountCardLinkage', () => {
  let mockShowToast: jest.Mock;
  let mockToastRef: { current: { showToast: jest.Mock } };

  const renderLinkageHook = () =>
    renderHook(() => useMoneyAccountCardLinkage(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <ToastContext.Provider value={{ toastRef: mockToastRef } as never}>
          {children}
        </ToastContext.Provider>
      ),
    });

  beforeEach(() => {
    jest.clearAllMocks();
    mockShowToast = jest.fn();
    mockToastRef = { current: { showToast: mockShowToast } };

    mockResolveMoneyAccountCardToken.mockReturnValue(MOCK_TOKEN);
    mockUseMoneyAccountBalance.mockReturnValue({ totalFiatRaw: '0' });
    applySelectorMocks(buildSelectors());
  });

  describe('derived state', () => {
    it('reports canLink=true when all requirements are met', () => {
      const { result } = renderLinkageHook();

      expect(result.current.canLink).toBe(true);
      expect(result.current.hasMoneyAccountRequirements).toBe(true);
      expect(result.current.isCardAuthenticated).toBe(true);
      expect(result.current.moneyAccountCardToken).toBe(MOCK_TOKEN);
      expect(result.current.status).toBe('idle');
      expect(result.current.isLinking).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('reports canLink=false when the card is not authenticated', () => {
      applySelectorMocks(buildSelectors({ isCardAuthenticated: false }));
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(false);
    });

    it('reports canLink=false when there is no Money account', () => {
      applySelectorMocks(buildSelectors({ primaryMoneyAccount: undefined }));
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(false);
    });

    it('reports canLink=false when the feature flag is off', () => {
      applySelectorMocks(buildSelectors({ isMoneyAccountEnabled: false }));
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(false);
    });

    it('reports canLink=false when vault config is missing', () => {
      applySelectorMocks(buildSelectors({ vaultConfig: undefined }));
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(false);
    });

    it('reports canLink=false when the Monad USDC token cannot be resolved', () => {
      mockResolveMoneyAccountCardToken.mockReturnValueOnce(null);
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(false);
    });
  });

  describe('isFunded derivation', () => {
    it('returns false when totalFiatRaw is undefined', () => {
      mockUseMoneyAccountBalance.mockReturnValue({ totalFiatRaw: undefined });
      const { result } = renderLinkageHook();
      expect(result.current.isFunded).toBe(false);
    });

    it("returns false when totalFiatRaw is '0'", () => {
      mockUseMoneyAccountBalance.mockReturnValue({ totalFiatRaw: '0' });
      const { result } = renderLinkageHook();
      expect(result.current.isFunded).toBe(false);
    });

    it('returns true for any positive balance', () => {
      mockUseMoneyAccountBalance.mockReturnValue({ totalFiatRaw: '10' });
      const { result } = renderLinkageHook();
      expect(result.current.isFunded).toBe(true);
    });

    it('returns false when totalFiatRaw is not a finite number', () => {
      mockUseMoneyAccountBalance.mockReturnValue({ totalFiatRaw: 'NaN' });
      const { result } = renderLinkageHook();
      expect(result.current.isFunded).toBe(false);
    });
  });

  describe('linkInBackground - happy path', () => {
    it('transitions idle -> pending -> success and calls the controller once with BAANX_MAX_LIMIT and the MA address', async () => {
      mockLinkMoneyAccountCard.mockResolvedValueOnce(undefined);

      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.linkInBackground();
      });

      expect(returned).toBe(true);
      expect(result.current.status).toBe('success');
      expect(result.current.error).toBeNull();
      expect(mockLinkMoneyAccountCard).toHaveBeenCalledTimes(1);
      expect(mockLinkMoneyAccountCard).toHaveBeenCalledWith({
        moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
        delegationAmountHuman: BAANX_MAX_LIMIT,
      });
    });

    it('shows the Predict-style pending toast with a Spinner startAccessory before the success toast', async () => {
      let resolveLink: () => void = () => undefined;
      mockLinkMoneyAccountCard.mockReturnValueOnce(
        new Promise<void>((resolve) => {
          resolveLink = resolve;
        }),
      );

      const { result } = renderLinkageHook();

      let linkPromise: Promise<boolean> | undefined;
      act(() => {
        linkPromise = result.current.linkInBackground();
      });

      const pendingCall = mockShowToast.mock.calls[0]?.[0];
      expect(pendingCall).toMatchObject({
        hasNoTimeout: true,
        labelOptions: [
          { label: 'Linking card', isBold: true },
          { label: '\n', isBold: false },
          { label: 'Approving spending limit…', isBold: false },
        ],
      });
      expect(pendingCall?.startAccessory).toBeDefined();

      await act(async () => {
        resolveLink();
        await linkPromise;
      });

      const successCall = mockShowToast.mock.calls[1]?.[0];
      expect(successCall).toMatchObject({
        labelOptions: [
          { label: 'Card linked successfully', isBold: true },
          { label: '\n', isBold: false },
          { label: 'You can now spend while you earn', isBold: false },
        ],
        hasNoTimeout: false,
      });
    });
  });

  describe('linkInBackground - failure paths', () => {
    it('sets status=error and shows error toast on generic reject', async () => {
      mockLinkMoneyAccountCard.mockRejectedValueOnce(new Error('boom'));

      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.linkInBackground();
      });

      expect(returned).toBe(false);
      expect(result.current.status).toBe('error');
      expect(result.current.error?.message).toBe('boom');
      expect(Logger.error).toHaveBeenCalled();

      const errorCall = mockShowToast.mock.calls.at(-1)?.[0];
      expect(errorCall).toMatchObject({
        labelOptions: [{ label: "Couldn't link card", isBold: true }],
        hasNoTimeout: false,
      });
    });

    it('sets status=cancelled and shows NO error toast on UserCancelledError', async () => {
      const { UserCancelledError } = jest.requireMock('./useCardDelegation');
      mockLinkMoneyAccountCard.mockRejectedValueOnce(
        new UserCancelledError('User denied'),
      );

      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.linkInBackground();
      });

      expect(returned).toBe(false);
      expect(result.current.status).toBe('cancelled');

      // Only the pending toast should have fired — no error toast.
      const lastCall = mockShowToast.mock.calls.at(-1)?.[0];
      expect(lastCall).toMatchObject({ hasNoTimeout: true });
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('fails closed when canLink is false: no controller call, error toast, returns false', async () => {
      applySelectorMocks(buildSelectors({ isCardAuthenticated: false }));
      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.linkInBackground();
      });

      expect(returned).toBe(false);
      expect(mockLinkMoneyAccountCard).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast.mock.calls[0][0]).toMatchObject({
        labelOptions: [{ label: "Couldn't link card", isBold: true }],
      });
    });
  });

  describe('linkInteractive', () => {
    it('transitions idle -> pending -> success and forwards the validated amount to the controller', async () => {
      mockLinkMoneyAccountCard.mockResolvedValueOnce(undefined);
      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.linkInteractive({ amount: '250' });
      });

      expect(returned).toBe(true);
      expect(result.current.status).toBe('success');
      expect(mockLinkMoneyAccountCard).toHaveBeenCalledTimes(1);
      expect(mockLinkMoneyAccountCard).toHaveBeenCalledWith({
        moneyAccountAddress: MONEY_ACCOUNT_ADDRESS,
        delegationAmountHuman: '250',
      });
    });

    it('shows the same Predict-style pending + success toast pattern as linkInBackground', async () => {
      mockLinkMoneyAccountCard.mockResolvedValueOnce(undefined);
      const { result } = renderLinkageHook();

      await act(async () => {
        await result.current.linkInteractive({ amount: '100' });
      });

      expect(mockShowToast.mock.calls[0]?.[0]).toMatchObject({
        hasNoTimeout: true,
        labelOptions: [
          { label: 'Linking card', isBold: true },
          { label: '\n', isBold: false },
          { label: 'Approving spending limit…', isBold: false },
        ],
      });
      expect(mockShowToast.mock.calls[1]?.[0]).toMatchObject({
        labelOptions: [
          { label: 'Card linked successfully', isBold: true },
          { label: '\n', isBold: false },
          { label: 'You can now spend while you earn', isBold: false },
        ],
      });
    });

    it('sets status=error and shows error toast on generic reject', async () => {
      mockLinkMoneyAccountCard.mockRejectedValueOnce(new Error('boom'));
      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.linkInteractive({ amount: '100' });
      });

      expect(returned).toBe(false);
      expect(result.current.status).toBe('error');
      expect(result.current.error?.message).toBe('boom');
      expect(mockShowToast.mock.calls.at(-1)?.[0]).toMatchObject({
        labelOptions: [{ label: "Couldn't link card", isBold: true }],
      });
    });

    it('sets status=cancelled and shows NO error toast on UserCancelledError', async () => {
      const { UserCancelledError } = jest.requireMock('./useCardDelegation');
      mockLinkMoneyAccountCard.mockRejectedValueOnce(
        new UserCancelledError('User denied'),
      );
      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.linkInteractive({ amount: '100' });
      });

      expect(returned).toBe(false);
      expect(result.current.status).toBe('cancelled');
      expect(mockShowToast.mock.calls.at(-1)?.[0]).toMatchObject({
        hasNoTimeout: true,
      });
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('fails closed when canLink is false: no controller call, returns false', async () => {
      applySelectorMocks(buildSelectors({ isCardAuthenticated: false }));
      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.linkInteractive({ amount: '100' });
      });

      expect(returned).toBe(false);
      expect(mockLinkMoneyAccountCard).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('clears status and error back to idle / null', async () => {
      mockLinkMoneyAccountCard.mockRejectedValueOnce(new Error('boom'));

      const { result } = renderLinkageHook();

      await act(async () => {
        await result.current.linkInBackground();
      });
      expect(result.current.status).toBe('error');
      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
    });
  });
});
