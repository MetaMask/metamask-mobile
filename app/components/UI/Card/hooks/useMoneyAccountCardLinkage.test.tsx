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
  selectIsMoneyAccountDelegatedForCard,
} from '../../../../selectors/cardController';
import { selectMoneyEnableMoneyAccountFlag } from '../../Money/selectors/featureFlags';
import { resolveMoneyAccountCardToken } from '../../../../core/Engine/controllers/card-controller/utils/moneyAccountCardToken';
import Routes from '../../../../constants/navigation/Routes';
import { BAANX_MAX_LIMIT } from '../constants';
import { FundingStatus } from '../types';
import { useMoneyAccountCardLinkage } from './useMoneyAccountCardLinkage';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const mockLinkMoneyAccountCard = jest.fn();
const mockIsLinkageInProgress = jest.fn<boolean, []>();
jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      CardController: {
        linkMoneyAccountCard: (...args: unknown[]) =>
          mockLinkMoneyAccountCard(...args),
        isLinkageInProgress: () => mockIsLinkageInProgress(),
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
  '../../../../core/Engine/controllers/card-controller/provider-types',
  () => {
    class MockCardLinkageInProgressError extends Error {
      constructor(
        message = 'A Money Account to Card linkage is already in progress',
      ) {
        super(message);
        this.name = 'CardLinkageInProgressError';
      }
    }
    return { CardLinkageInProgressError: MockCardLinkageInProgressError };
  },
);

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
    isAlreadyDelegated?: boolean;
  } = {},
) => ({
  primaryMoneyAccount: { address: MONEY_ACCOUNT_ADDRESS },
  vaultConfig: { id: 'vault-1' },
  isMoneyAccountEnabled: true,
  isCardAuthenticated: true,
  delegationSettings: { ok: true },
  isAlreadyDelegated: false,
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
    if (selector === selectIsMoneyAccountDelegatedForCard)
      return state.isAlreadyDelegated;
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
    applySelectorMocks(buildSelectors());
    // Default: no in-flight linkage. Singleflight-specific tests override
    // this within their own `it` blocks.
    mockIsLinkageInProgress.mockReturnValue(false);
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

    it('reports canLink=false when the Money Account is already delegated for card (re-link suppressed)', () => {
      applySelectorMocks(buildSelectors({ isAlreadyDelegated: true }));
      const { result } = renderLinkageHook();
      expect(result.current.canLink).toBe(false);
    });
  });

  describe('openLinkCardSheet (sheet entrypoint)', () => {
    it('navigates to the Link Card sheet and does NOT call the controller when canLink is true', () => {
      const { result } = renderLinkageHook();

      act(() => {
        result.current.openLinkCardSheet();
      });

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MONEY.MODALS.ROOT, {
        screen: Routes.MONEY.MODALS.LINK_CARD_SHEET,
      });
      expect(mockLinkMoneyAccountCard).not.toHaveBeenCalled();
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(result.current.status).toBe('idle');
    });

    it('fails closed (error toast, no nav, no controller call) when canLink is false', () => {
      applySelectorMocks(buildSelectors({ isCardAuthenticated: false }));
      const { result } = renderLinkageHook();

      act(() => {
        result.current.openLinkCardSheet();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockLinkMoneyAccountCard).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast.mock.calls[0][0]).toMatchObject({
        labelOptions: [{ label: "Couldn't link card", isBold: true }],
      });
    });

    it('fails closed when the Monad USDC token cannot be resolved', () => {
      mockResolveMoneyAccountCardToken.mockReturnValueOnce(null);
      const { result } = renderLinkageHook();

      act(() => {
        result.current.openLinkCardSheet();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('fails closed when there is no primary Money account', () => {
      applySelectorMocks(buildSelectors({ primaryMoneyAccount: undefined }));
      const { result } = renderLinkageHook();

      act(() => {
        result.current.openLinkCardSheet();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('fails closed when the Money Account is already delegated (defensive guard for direct callers)', () => {
      applySelectorMocks(buildSelectors({ isAlreadyDelegated: true }));
      const { result } = renderLinkageHook();

      act(() => {
        result.current.openLinkCardSheet();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockLinkMoneyAccountCard).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });
  });

  describe('confirmLinkInBackground - happy path', () => {
    it('transitions idle -> pending -> success and calls the controller once with BAANX_MAX_LIMIT and the MA address', async () => {
      mockLinkMoneyAccountCard.mockResolvedValueOnce(undefined);

      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.confirmLinkInBackground();
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

    it('does NOT navigate to the sheet (sheet is the caller, not the callee)', async () => {
      mockLinkMoneyAccountCard.mockResolvedValueOnce(undefined);
      const { result } = renderLinkageHook();

      await act(async () => {
        await result.current.confirmLinkInBackground();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
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
        linkPromise = result.current.confirmLinkInBackground();
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

  describe('confirmLinkInBackground - failure paths', () => {
    it('sets status=error and shows error toast on generic reject', async () => {
      mockLinkMoneyAccountCard.mockRejectedValueOnce(new Error('boom'));

      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.confirmLinkInBackground();
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
        returned = await result.current.confirmLinkInBackground();
      });

      expect(returned).toBe(false);
      expect(result.current.status).toBe('cancelled');

      // Only the pending toast should have fired — no error toast.
      const lastCall = mockShowToast.mock.calls.at(-1)?.[0];
      expect(lastCall).toMatchObject({ hasNoTimeout: true });
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('fails closed when canLink is false (defence in depth): no controller call, error toast, returns false', async () => {
      applySelectorMocks(buildSelectors({ isCardAuthenticated: false }));
      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.confirmLinkInBackground();
      });

      expect(returned).toBe(false);
      expect(mockLinkMoneyAccountCard).not.toHaveBeenCalled();
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      expect(mockShowToast.mock.calls[0][0]).toMatchObject({
        labelOptions: [{ label: "Couldn't link card", isBold: true }],
      });
    });
  });

  describe('reset', () => {
    it('clears status and error back to idle / null', async () => {
      mockLinkMoneyAccountCard.mockRejectedValueOnce(new Error('boom'));

      const { result } = renderLinkageHook();

      await act(async () => {
        await result.current.confirmLinkInBackground();
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

  describe('confirmLinkInBackground - singleflight', () => {
    it('silently no-ops when CardController.isLinkageInProgress() returns true', async () => {
      mockIsLinkageInProgress.mockReturnValue(true);

      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.confirmLinkInBackground();
      });

      expect(returned).toBe(false);
      expect(mockShowToast).not.toHaveBeenCalled();
      expect(mockLinkMoneyAccountCard).not.toHaveBeenCalled();
      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
      expect(Logger.error).not.toHaveBeenCalled();
    });

    it('silently handles CardLinkageInProgressError thrown by the controller (defence-in-depth)', async () => {
      const { CardLinkageInProgressError } = jest.requireMock(
        '../../../../core/Engine/controllers/card-controller/provider-types',
      );
      mockIsLinkageInProgress.mockReturnValue(false);
      mockLinkMoneyAccountCard.mockRejectedValueOnce(
        new CardLinkageInProgressError(),
      );

      const { result } = renderLinkageHook();

      let returned: boolean | undefined;
      await act(async () => {
        returned = await result.current.confirmLinkInBackground();
      });

      expect(returned).toBe(false);
      // The pending toast WAS shown — we cleared the sync gate, so the
      // UI side-effect ran. But the in-progress catch branch must NOT
      // surface a success or error toast.
      expect(mockShowToast).toHaveBeenCalledTimes(1);
      const onlyToast = mockShowToast.mock.calls[0]?.[0];
      expect(onlyToast).toMatchObject({ hasNoTimeout: true });
      // Not an error: must not be logged or transitioned to error state.
      expect(Logger.error).not.toHaveBeenCalled();
      // Critical cleanup: the catch branch must roll back the local UI
      // state so the second hook instance does NOT get stuck in a
      // `pending` / `isLinking=true` shape. The first call's eventual
      // success/error toast will replace the pending spinner toast.
      expect(result.current.status).toBe('idle');
      expect(result.current.isLinking).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
