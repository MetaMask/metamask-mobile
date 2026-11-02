import React, { StrictMode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import type { AutorampDepositInstructions } from '@metamask/ramps-controller';
import renderWithProvider, {
  type ProviderValues,
} from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import { updateBgState } from '../../../../../core/redux/slices/engine';
import Logger from '../../../../../util/Logger';
import { strings } from '../../../../../../locales/i18n';
import VbaDetails, { VbaDetailsSelectorsIDs } from './VbaDetails';
import { VbaDepositDebugSelectorsIDs } from './VbaDepositDebugSheet';
import { resetMusdAutorampSetupGuard } from './ensureMusdAutoramp';
import {
  clearCachedDepositInstructions,
  getCachedDepositInstructions,
  setCachedDepositInstructions,
} from './vbaDepositInstructionsCache';
import { VbaCreatingAccountSelectorsIDs } from './VbaCreatingAccount';
import Routes from '../../../../../constants/navigation/Routes';
import { useScreenPerformance } from '../../../../../hooks/useScreenPerformance';
import {
  VBA_SCREEN_CONTENT_STATE,
  VBA_SCREEN_ID,
  VBA_SCREEN_PERFORMANCE_CONFIG,
} from './vbaScreenPerformance';
import { TraceName } from '../../../../../util/trace';
import {
  endVbaCufChildTrace,
  endVbaCufJourney,
  startVbaCufChildTrace,
} from './vbaCufTrace';
import { VBA_CUF_END_REASON } from './vbaCufTags';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetDepositInstructions = jest.fn();
const mockListTransactions = jest.fn();
const mockRefreshAutorampTransactions = jest.fn();
const mockRefreshAutoramp = jest.fn();
const mockHydrate = jest.fn();
const mockRegisterWallet = jest.fn();
const mockCreateAutoramp = jest.fn();
const mockNavigateToVbaOnboardingDestination = jest.fn();
let mockWalletAddress: string | null = '0xabc';
let mockLocation: string | undefined = 'BR';
let mockRouteParams: { sourceCurrency?: string } | undefined;
let mockChooseCurrency = false;
let mockRegionOverride: string | undefined;
let mockNeobankFlagOn = true;
let mockDebugEnv: string | undefined;
let mockHardwareTier: 'LOW' | 'MID' | 'HIGH' | null;
let mockNetworkTier: 'NONE' | 'SLOW_CELLULAR' | 'FAST_CELLULAR' | 'WIFI' | null;
let mockCanGoBack = true;

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

const mockNavigation = {
  canGoBack: () => mockCanGoBack,
  goBack: (...args: unknown[]) => mockGoBack(...args),
  navigate: (...args: unknown[]) => mockNavigate(...args),
};
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  // Stable like the real hook, so effects keyed on navigation do not rerun.
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('../../../../../selectors/rampsController', () => ({
  selectSelectedVbaWalletAddress: () => mockWalletAddress,
}));

jest.mock('../../../../../selectors/featureFlagController/moneyAccount', () => {
  const actual = jest.requireActual(
    '../../../../../selectors/featureFlagController/moneyAccount',
  );
  return {
    ...actual,
    selectMoneyMovementNeobank: (state: unknown) =>
      mockNeobankFlagOn
        ? {
            isEnabled: true,
            regions: ['BR', 'US'],
            regionCurrencies: { BR: 'BRL', US: 'USD' },
            defaultCurrency: undefined,
            chooseCurrency: mockChooseCurrency,
            regionOverride: mockRegionOverride,
          }
        : actual.selectMoneyMovementNeobank(state),
  };
});

jest.mock('../../../../../selectors/geolocationController', () => ({
  selectGeolocationLocation: () => mockLocation,
}));

jest.mock('../../../../../util/deviceCapability', () => ({
  getHardwareTier: () => mockHardwareTier,
}));

jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => mockNetworkTier,
}));
jest.mock('./vbaCufTrace', () => ({
  startVbaCufChildTrace: jest.fn(() => 'vba-child-id'),
  endVbaCufChildTrace: jest.fn(),
  endVbaCufJourney: jest.fn(),
}));

const mockStartVbaCufChildTrace = jest.mocked(startVbaCufChildTrace);
const mockEndVbaCufChildTrace = jest.mocked(endVbaCufChildTrace);
const mockEndVbaCufJourney = jest.mocked(endVbaCufJourney);

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

jest.mock('./vbaDepositDebug', () => ({
  isVbaDepositDebugEnabled: () => mockDebugEnv === 'true',
}));

jest.mock('./hooks/useVbaOnboardingRouting', () => ({
  navigateToVbaOnboardingDestination: (...args: unknown[]) =>
    mockNavigateToVbaOnboardingDestination(...args),
}));

jest.mock('../../../../../hooks/useScreenPerformance');
const mockUseScreenPerformance = jest.mocked(useScreenPerformance);

jest.mock('../../../../../core/Engine', () => ({
  // Lets tests push RampsController changes into Redux via updateBgState.
  get state() {
    return { RampsController: this.context.RampsController.state };
  },
  context: {
    RampsController: {
      state: {
        autoramps: [
          {
            id: 'ar-1',
            walletAddress: '0xabc',
            status: 'Approved',
          },
        ],
      },
      refreshAutoramp: (...args: unknown[]) => mockRefreshAutoramp(...args),
      hydrateVbaOnboarding: (...args: unknown[]) => mockHydrate(...args),
      registerMoneyAccountWallet: (...args: unknown[]) =>
        mockRegisterWallet(...args),
      createAutoramp: (...args: unknown[]) => mockCreateAutoramp(...args),
      refreshAutorampTransactions: (...args: unknown[]) =>
        mockRefreshAutorampTransactions(...args),
    },
    NeoBankService: {
      getDepositInstructions: (...args: unknown[]) =>
        mockGetDepositInstructions(...args),
      listAutorampTransactions: (...args: unknown[]) =>
        mockListTransactions(...args),
    },
  },
}));

interface TestAutoramp {
  id: string;
  walletAddress: string;
  status: string;
  depositRailsSummary?: { currency?: string };
}

const approvedAutoramp: TestAutoramp = {
  id: 'ar-1',
  walletAddress: '0xabc',
  status: 'Approved',
  depositRailsSummary: { currency: 'BRL' },
};

const pixInstructions = {
  type: 'Pix' as const,
  brCode: '00020126',
  instruction: 'Pay with PIX',
  pixKey: 'pix@example.com',
};

// Test fixtures use plain status strings, not the controller's enum.
const withPersistedAutoramps = (
  autoramps: TestAutoramp[],
): ProviderValues['state'] =>
  ({
    engine: { backgroundState: { RampsController: { autoramps } } },
  }) as unknown as ProviderValues['state'];

const setAutoramps = (autoramps: TestAutoramp[]) => {
  (
    Engine.context.RampsController.state as { autoramps: TestAutoramp[] }
  ).autoramps = autoramps;
};

interface EngineContextMock {
  NeoBankService?: {
    getDepositInstructions: typeof mockGetDepositInstructions;
    listAutorampTransactions: typeof mockListTransactions;
  };
}

const restoreNeoBankService = () => {
  (Engine.context as unknown as EngineContextMock).NeoBankService = {
    getDepositInstructions: mockGetDepositInstructions,
    listAutorampTransactions: mockListTransactions,
  };
};

describe('VbaDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartVbaCufChildTrace.mockReturnValue('vba-child-id');
    resetMusdAutorampSetupGuard();
    clearCachedDepositInstructions();
    mockWalletAddress = '0xabc';
    mockLocation = 'BR';
    mockRouteParams = undefined;
    mockChooseCurrency = false;
    mockRegionOverride = undefined;
    mockNeobankFlagOn = true;
    mockDebugEnv = undefined;
    mockHardwareTier = null;
    mockNetworkTier = null;
    mockCanGoBack = true;
    mockGetDepositInstructions.mockResolvedValue(null);
    mockListTransactions.mockResolvedValue([]);
    mockRefreshAutorampTransactions.mockResolvedValue([]);
    mockRefreshAutoramp.mockResolvedValue(approvedAutoramp);
    mockHydrate.mockResolvedValue({ autorampStatus: 'not_ready' });
    mockRegisterWallet.mockResolvedValue({ type: 'alreadyRegistered' });
    mockCreateAutoramp.mockResolvedValue({
      id: 'ar-new',
      walletAddress: '0xabc',
      status: 'Created',
    });
    setAutoramps([{ ...approvedAutoramp }]);
    restoreNeoBankService();
  });

  it('renders the details screen', async () => {
    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <VbaDetails />,
    );

    expect(getByTestId(VbaDetailsSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.HEADER)).toBeOnTheScreen();
    expect(queryByTestId('vba-details-logo')).not.toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.TITLE)).toHaveTextContent(
      strings('virtual_bank_account.vba_details.title'),
    );
    expect(
      getByText(
        'Add funds directly from your bank. Funds usually land in your Money account within minutes.',
      ),
    ).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.DONE_BUTTON)).toBeOnTheScreen();
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.HELPER_TEXT),
    ).not.toBeOnTheScreen();
    await waitFor(() => {
      expect(mockGetDepositInstructions).toHaveBeenCalledWith('ar-1');
    });
    expect(mockListTransactions).not.toHaveBeenCalled();
    expect(mockRefreshAutorampTransactions).toHaveBeenCalledWith('ar-1');
  });

  it('returns to the caller from the header', async () => {
    const { getByTestId } = renderWithProvider(<VbaDetails />);
    await waitFor(() => {
      expect(mockGetDepositInstructions).toHaveBeenCalledWith('ar-1');
    });

    fireEvent.press(getByTestId(VbaDetailsSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockEndVbaCufJourney).toHaveBeenCalledWith(
      false,
      VBA_CUF_END_REASON.BAILED,
    );
  });

  it('returns to the caller from the Done button, like the header back', async () => {
    const { getByTestId } = renderWithProvider(<VbaDetails />);
    await waitFor(() => {
      expect(mockGetDepositInstructions).toHaveBeenCalledWith('ar-1');
    });

    const doneButton = getByTestId(VbaDetailsSelectorsIDs.DONE_BUTTON);
    expect(doneButton).toHaveTextContent('Done');
    fireEvent.press(doneButton);

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockEndVbaCufJourney).toHaveBeenCalledWith(
      false,
      VBA_CUF_END_REASON.BAILED,
    );
  });

  it('returns to Money home from the Done button when there is no navigation history', async () => {
    mockCanGoBack = false;
    const { getByTestId } = renderWithProvider(<VbaDetails />);
    await waitFor(() => {
      expect(mockGetDepositInstructions).toHaveBeenCalledWith('ar-1');
    });

    fireEvent.press(getByTestId(VbaDetailsSelectorsIDs.DONE_BUTTON));

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });

  it('returns to Money home when there is no navigation history', async () => {
    mockCanGoBack = false;
    const { getByTestId } = renderWithProvider(<VbaDetails />);
    await waitFor(() => {
      expect(mockGetDepositInstructions).toHaveBeenCalledWith('ar-1');
    });

    fireEvent.press(getByTestId(VbaDetailsSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });

  it('renders cached Pix details immediately and revalidates in the background', async () => {
    setCachedDepositInstructions('ar-1', pixInstructions);
    mockGetDepositInstructions.mockResolvedValue({
      ...pixInstructions,
      pixKey: 'new@example.com',
    });

    const { getByTestId, queryByTestId, getByText } = renderWithProvider(
      <VbaDetails />,
    );

    expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    expect(queryByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeNull();
    await waitFor(() => {
      expect(getByText('new@example.com')).toBeOnTheScreen();
    });
    expect(mockGetDepositInstructions).toHaveBeenCalledWith('ar-1');
  });

  it('reopens instantly with details fetched on the first visit', async () => {
    mockGetDepositInstructions.mockResolvedValue(pixInstructions);
    const first = renderWithProvider(<VbaDetails />);
    await waitFor(() => {
      expect(
        first.getByTestId(VbaDetailsSelectorsIDs.PIX_CODE),
      ).toBeOnTheScreen();
    });
    first.unmount();

    const { getByTestId, queryByTestId } = renderWithProvider(<VbaDetails />);

    expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    expect(queryByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeNull();
  });

  it('ignores cached details for an account whose currency is not confirmed', () => {
    setAutoramps([{ ...approvedAutoramp, depositRailsSummary: undefined }]);
    setCachedDepositInstructions('ar-1', pixInstructions);

    const { getByTestId, queryByTestId } = renderWithProvider(<VbaDetails />);

    expect(getByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeOnTheScreen();
    expect(queryByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeNull();
  });

  it('clears shown details when a background hydrate rejects the autoramp', async () => {
    setAutoramps([approvedAutoramp]);
    setCachedDepositInstructions('ar-1', pixInstructions);
    mockGetDepositInstructions.mockResolvedValue(pixInstructions);
    const { getByTestId, queryByTestId, store } = renderWithProvider(
      <VbaDetails />,
      { state: withPersistedAutoramps([approvedAutoramp]) },
    );
    expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    await waitFor(() => {
      expect(mockGetDepositInstructions).toHaveBeenCalled();
    });

    setAutoramps([{ ...approvedAutoramp, status: 'Rejected' }]);
    await act(async () => {
      store.dispatch(updateBgState({ key: 'RampsController' }));
    });

    expect(queryByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeNull();
    await waitFor(() => {
      expect(mockNavigateToVbaOnboardingDestination).toHaveBeenCalledWith(
        expect.anything(),
        'accountCreateGeneric',
        undefined,
        undefined,
        'BRL',
      );
    });
  });

  it('drops late details and routes away when the autoramp is rejected mid-fetch', async () => {
    setAutoramps([approvedAutoramp]);
    let resolveDetails: (value: typeof pixInstructions) => void = () =>
      undefined;
    mockGetDepositInstructions.mockReturnValue(
      new Promise((resolve) => {
        resolveDetails = resolve;
      }),
    );
    const { queryByTestId, getByTestId, store } = renderWithProvider(
      <VbaDetails />,
      { state: withPersistedAutoramps([approvedAutoramp]) },
    );
    await waitFor(() => {
      expect(mockGetDepositInstructions).toHaveBeenCalledWith('ar-1');
    });

    setAutoramps([{ ...approvedAutoramp, status: 'Rejected' }]);
    await act(async () => {
      store.dispatch(updateBgState({ key: 'RampsController' }));
    });
    await act(async () => {
      resolveDetails(pixInstructions);
    });

    expect(queryByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeNull();
    expect(getByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeOnTheScreen();
    expect(getCachedDepositInstructions('ar-1')).toBeNull();
    // Routes on an immediate re-poll, not the next 10s interval.
    await waitFor(() => {
      expect(mockNavigateToVbaOnboardingDestination).toHaveBeenCalledWith(
        expect.anything(),
        'accountCreateGeneric',
        undefined,
        undefined,
        'BRL',
      );
    });
  });

  it('shows both Pix rows without leading key icons', async () => {
    mockGetDepositInstructions.mockResolvedValue(pixInstructions);

    const { getByLabelText, getByTestId, getByText, queryByTestId } =
      renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });
    expect(mockStartVbaCufChildTrace).toHaveBeenCalledWith(
      TraceName.VbaPixFetch,
    );
    expect(mockEndVbaCufChildTrace).toHaveBeenCalledWith('vba-child-id', true);
    expect(mockEndVbaCufJourney).toHaveBeenCalledWith(true);
    expect(mockUseScreenPerformance).toHaveBeenCalledWith({
      config: VBA_SCREEN_PERFORMANCE_CONFIG,
      screenId: VBA_SCREEN_ID.ACCOUNT_DETAILS,
      resetKey: '0xabc:BRL',
      enabled: true,
      contentReady: true,
      contentState: VBA_SCREEN_CONTENT_STATE.POPULATED,
    });
    expect(getByText('Pix Copia e Cola')).toBeOnTheScreen();
    expect(getByText('00020126')).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.PIX_KEY)).toBeOnTheScreen();
    expect(getByText('Pix key')).toBeOnTheScreen();
    expect(getByText('pix@example.com')).toBeOnTheScreen();
    expect(
      queryByTestId('vba-details-row-icon-copia-cola'),
    ).not.toBeOnTheScreen();
    expect(queryByTestId('vba-details-row-icon-pix-key')).not.toBeOnTheScreen();
    expect(getByLabelText('Copy Pix Copia e Cola')).toBeOnTheScreen();
    expect(getByLabelText('Copy Pix key')).toBeOnTheScreen();
    expect(mockRefreshAutoramp).not.toHaveBeenCalled();
    expect(mockListTransactions).not.toHaveBeenCalled();
    expect(mockRefreshAutorampTransactions).toHaveBeenCalledWith('ar-1');
  });

  it('lists the Pix key before Copia e Cola', async () => {
    mockGetDepositInstructions.mockResolvedValue(pixInstructions);

    const { getAllByLabelText, getByTestId } = renderWithProvider(
      <VbaDetails />,
    );
    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });

    expect(
      getAllByLabelText(/^Copy Pix/).map(
        (button) => button.props.accessibilityLabel,
      ),
    ).toEqual(['Copy Pix key', 'Copy Pix Copia e Cola']);
  });

  it('copies a Pix value', async () => {
    mockGetDepositInstructions.mockResolvedValue(pixInstructions);

    const { getByLabelText, getByTestId } = renderWithProvider(<VbaDetails />);
    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_KEY)).toBeOnTheScreen();
    });

    fireEvent.press(getByLabelText('Copy Pix key'));

    expect(Clipboard.setString).toHaveBeenCalledWith('pix@example.com');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Copied Pix key',
    );
  });

  describe('when NeoBankService reads every deposit rail', () => {
    const usBankInstructions = {
      type: 'UsBank',
      rail: 'ACH',
      accountHolder: 'Jane Doe',
      routingNumber: '021000021',
      accountNumber: '123456789',
      bankName: 'Lead Bank',
    };

    it('shows the US bank transfer rows', async () => {
      mockGetDepositInstructions.mockResolvedValue(usBankInstructions);

      const { getByTestId, getByText } = renderWithProvider(<VbaDetails />);

      await waitFor(() => {
        expect(
          getByTestId(VbaDetailsSelectorsIDs.ACCOUNT_HOLDER),
        ).toBeOnTheScreen();
      });
      expect(getByTestId(VbaDetailsSelectorsIDs.TITLE)).toHaveTextContent(
        strings('virtual_bank_account.vba_details.bank_transfer_title'),
      );
      expect(getByText('Jane Doe')).toBeOnTheScreen();
      expect(getByText('021000021')).toBeOnTheScreen();
      expect(getByText('123456789')).toBeOnTheScreen();
      expect(getByText('Lead Bank')).toBeOnTheScreen();
      expect(getByTestId(VbaDetailsSelectorsIDs.BANK_NAME)).toBeOnTheScreen();
      expect(mockGetDepositInstructions).toHaveBeenCalledWith('ar-1');
      expect(mockEndVbaCufJourney).toHaveBeenCalledWith(true);
    });

    it('copies the routing number', async () => {
      mockGetDepositInstructions.mockResolvedValue(usBankInstructions);

      const { getByLabelText, getByTestId } = renderWithProvider(
        <VbaDetails />,
      );

      await waitFor(() => {
        expect(
          getByTestId(VbaDetailsSelectorsIDs.ACCOUNT_HOLDER),
        ).toBeOnTheScreen();
      });

      fireEvent.press(getByLabelText('Copy Routing number'));

      expect(Clipboard.setString).toHaveBeenCalledWith('021000021');
    });

    it('renders cached US bank details immediately for a USD account', () => {
      mockRouteParams = { sourceCurrency: 'USD' };
      setAutoramps([
        {
          id: 'ar-1',
          walletAddress: '0xabc',
          status: 'Approved',
          depositRailsSummary: { currency: 'USD' },
        },
      ]);
      setCachedDepositInstructions(
        'ar-1',
        usBankInstructions as AutorampDepositInstructions,
      );
      mockGetDepositInstructions.mockReturnValue(new Promise(() => undefined));

      const { getByTestId, getByText, queryByTestId } = renderWithProvider(
        <VbaDetails />,
      );

      expect(getByTestId(VbaDetailsSelectorsIDs.TITLE)).toHaveTextContent(
        strings('virtual_bank_account.vba_details.bank_transfer_title'),
      );
      expect(getByText('021000021')).toBeOnTheScreen();
      expect(getByText('123456789')).toBeOnTheScreen();
      expect(queryByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeNull();
    });

    it('shows the bank transfer title while USD instructions are loading', async () => {
      mockRouteParams = { sourceCurrency: 'USD' };
      setAutoramps([
        {
          id: 'ar-1',
          walletAddress: '0xabc',
          status: 'Approved',
          depositRailsSummary: { currency: 'USD' },
        },
      ]);
      let resolveInstructions: (
        value: typeof usBankInstructions,
      ) => void = () => undefined;
      mockGetDepositInstructions.mockReturnValue(
        new Promise((resolve) => {
          resolveInstructions = resolve;
        }),
      );

      const { findByTestId } = renderWithProvider(<VbaDetails />);

      expect(
        await findByTestId(VbaDetailsSelectorsIDs.TITLE),
      ).toHaveTextContent(
        strings('virtual_bank_account.vba_details.bank_transfer_title'),
      );

      resolveInstructions(usBankInstructions);
      expect(
        await findByTestId(VbaDetailsSelectorsIDs.ACCOUNT_HOLDER),
      ).toBeOnTheScreen();
    });

    it('shows the Pix title when the loaded rail is Pix, even if USD was requested', async () => {
      mockRouteParams = { sourceCurrency: 'USD' };
      setAutoramps([
        {
          id: 'ar-1',
          walletAddress: '0xabc',
          status: 'Approved',
          depositRailsSummary: { currency: 'USD' },
        },
      ]);
      mockGetDepositInstructions.mockResolvedValue(pixInstructions);

      const { findByTestId } = renderWithProvider(<VbaDetails />);

      expect(
        await findByTestId(VbaDetailsSelectorsIDs.TITLE),
      ).toHaveTextContent(strings('virtual_bank_account.vba_details.title'));
    });

    it('shows the Pix rows when the autoramp has a Pix rail', async () => {
      mockGetDepositInstructions.mockResolvedValue(pixInstructions);

      const { getByTestId } = renderWithProvider(<VbaDetails />);

      await waitFor(() => {
        expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
      });
      expect(getByTestId(VbaDetailsSelectorsIDs.TITLE)).toHaveTextContent(
        strings('virtual_bank_account.vba_details.title'),
      );
    });

    it('keeps the loading skeleton until a supported rail arrives', async () => {
      mockGetDepositInstructions.mockResolvedValue(null);

      const { getByTestId, queryByText } = renderWithProvider(<VbaDetails />);

      await waitFor(() => {
        expect(getByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeOnTheScreen();
      });
      expect(
        queryByText('Your account details will appear here shortly.'),
      ).toBeNull();
    });
  });

  it('shows a loading skeleton until Pix loads', async () => {
    let resolvePix: (value: typeof pixInstructions) => void = () => undefined;
    mockGetDepositInstructions.mockReturnValue(
      new Promise((resolve) => {
        resolvePix = resolve;
      }),
    );

    const { getByTestId, queryByTestId } = renderWithProvider(<VbaDetails />);

    expect(getByTestId(VbaDetailsSelectorsIDs.LOADING)).toHaveProp(
      'accessibilityLabel',
      'Loading account details',
    );

    resolvePix(pixInstructions);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });
    expect(queryByTestId(VbaDetailsSelectorsIDs.LOADING)).not.toBeOnTheScreen();
  });

  it('shows Pix rows when the first fetch finishes after the network tier changes', async () => {
    let resolveFirst: (value: typeof pixInstructions) => void = () => undefined;
    mockGetDepositInstructions
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementation(() => new Promise(() => undefined));
    mockNetworkTier = null;

    const { getByTestId, queryByTestId, rerender } = renderWithProvider(
      <VbaDetails />,
    );

    expect(getByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeOnTheScreen();

    mockNetworkTier = 'WIFI';
    rerender(<VbaDetails />);
    resolveFirst(pixInstructions);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });
    expect(queryByTestId(VbaDetailsSelectorsIDs.LOADING)).not.toBeOnTheScreen();
  });

  it('keeps the loading skeleton when the backend returns no Pix code', async () => {
    const { getByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(mockGetDepositInstructions).toHaveBeenCalledWith('ar-1');
    });
    expect(getByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeOnTheScreen();
  });

  it('ends the Pix fetch trace after unmount', async () => {
    mockGetDepositInstructions.mockReturnValue(new Promise(() => undefined));
    const { unmount } = renderWithProvider(<VbaDetails />);
    expect(mockStartVbaCufChildTrace).toHaveBeenCalledTimes(1);

    unmount();
    await act(async () => undefined);

    expect(mockEndVbaCufChildTrace).toHaveBeenCalledWith(
      'vba-child-id',
      false,
      VBA_CUF_END_REASON.BAILED,
    );
  });

  it('does not fetch Pix instructions while offline', () => {
    mockNetworkTier = 'NONE';

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    expect(mockGetDepositInstructions).not.toHaveBeenCalled();
    expect(getByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeOnTheScreen();
  });

  it('hides the Pix key row when MoonPay omits it', async () => {
    mockGetDepositInstructions.mockResolvedValue({
      type: 'Pix',
      brCode: '00020126',
      instruction: 'Pay with PIX',
    });

    const { getByTestId, queryByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });
    expect(queryByTestId(VbaDetailsSelectorsIDs.PIX_KEY)).not.toBeOnTheScreen();
  });

  it('keeps the Pix code when the debug transaction poll fails', async () => {
    mockDebugEnv = 'true';
    mockGetDepositInstructions.mockResolvedValue(pixInstructions);
    mockRefreshAutorampTransactions.mockRejectedValue(
      new Error('tx poll failed'),
    );

    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <VbaDetails />,
    );

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });
    expect(getByText('00020126')).toBeOnTheScreen();
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.LOAD_ERROR),
    ).not.toBeOnTheScreen();
    expect(Logger.error).toHaveBeenCalled();
  });

  it('shows the newest deposit status in the debug sheet', async () => {
    mockDebugEnv = 'true';
    mockGetDepositInstructions.mockResolvedValue(pixInstructions);
    mockRefreshAutorampTransactions.mockResolvedValue([
      { id: 'tx-old', status: 'Completed', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'tx-new', status: 'Pending', createdAt: '2026-06-01T00:00:00Z' },
    ]);

    const { getByTestId, getByText } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(mockRefreshAutorampTransactions).toHaveBeenCalledWith('ar-1');
    });
    fireEvent.press(getByTestId(VbaDetailsSelectorsIDs.DEBUG_BUTTON));

    expect(
      getByTestId(VbaDepositDebugSelectorsIDs.TRANSACTION_STATUS),
    ).toBeOnTheScreen();
    expect(getByText('Deposit: Pending')).toBeOnTheScreen();
  });

  it('refreshes a non-Approved autoramp before loading PIX', async () => {
    setAutoramps([{ id: 'ar-1', walletAddress: '0xabc', status: 'Pending' }]);
    mockRefreshAutoramp.mockResolvedValue({
      id: 'ar-1',
      walletAddress: '0xabc',
      status: 'Approved',
    });
    mockGetDepositInstructions.mockResolvedValue(pixInstructions);

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    expect(mockCreateAutoramp).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mockRefreshAutoramp).toHaveBeenCalledWith('ar-1');
    });
    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });
  });

  it('stays on the creating state when refreshing the autoramp fails', async () => {
    setAutoramps([{ id: 'ar-1', walletAddress: '0xabc', status: 'Pending' }]);
    mockRefreshAutoramp.mockRejectedValue(new Error('refresh failed'));

    const { getByTestId, queryByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(Logger.error).toHaveBeenCalled();
    });
    expect(
      getByTestId(VbaCreatingAccountSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.LOAD_ERROR),
    ).not.toBeOnTheScreen();
  });

  it('shows Creating your bank account until the autoramp is Approved', async () => {
    setAutoramps([{ id: 'ar-1', walletAddress: '0xabc', status: 'Created' }]);
    mockRefreshAutoramp.mockResolvedValue({
      id: 'ar-1',
      walletAddress: '0xabc',
      status: 'Authorized',
    });

    const { getByText, queryByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(mockRefreshAutoramp).toHaveBeenCalledWith('ar-1');
    });
    expect(
      getByText(strings('virtual_bank_account.creating_account.title')),
    ).toBeOnTheScreen();
    expect(mockGetDepositInstructions).not.toHaveBeenCalled();
    expect(queryByTestId(VbaDetailsSelectorsIDs.CONTAINER)).toBeNull();
  });

  it('goes to Money home from the creating state back button', async () => {
    setAutoramps([]);

    const { getByTestId } = renderWithProvider(<VbaDetails />);
    await waitFor(() => {
      expect(mockHydrate).toHaveBeenCalled();
    });
    fireEvent.press(getByTestId(VbaCreatingAccountSelectorsIDs.BACK_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });

  it('keeps loading when no usable autoramp exists and the customer is not active', async () => {
    setAutoramps([]);
    mockHydrate.mockResolvedValue({
      autorampStatus: 'not_ready',
      kycStatus: 'approved',
    });

    const { getByTestId, getByText, queryByTestId } = renderWithProvider(
      <VbaDetails />,
    );

    await waitFor(() => {
      expect(mockHydrate).toHaveBeenCalled();
    });
    expect(
      getByText(
        strings('virtual_bank_account.creating_account.awaiting_provider'),
      ),
    ).toBeOnTheScreen();
    expect(
      getByTestId(VbaCreatingAccountSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
    expect(mockGetDepositInstructions).not.toHaveBeenCalled();
  });

  it('does nothing when no Money Account wallet is selected', async () => {
    mockWalletAddress = null;

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    expect(
      getByTestId(VbaCreatingAccountSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    await waitFor(() => {
      expect(mockGetDepositInstructions).not.toHaveBeenCalled();
    });
    expect(mockRefreshAutoramp).not.toHaveBeenCalled();
  });

  it('opens an existing approved account without creating one when moneyMovementNeobank is absent', async () => {
    mockNeobankFlagOn = false;
    mockGetDepositInstructions.mockResolvedValue(pixInstructions);

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });
    expect(mockHydrate).not.toHaveBeenCalled();
    expect(mockRegisterWallet).not.toHaveBeenCalled();
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
  });

  it('creates the autoramp for the flag region override ahead of the IP country', async () => {
    setAutoramps([]);
    mockLocation = 'DE';
    mockRegionOverride = 'BR';
    mockHydrate.mockResolvedValue({
      autorampStatus: 'needs_wallet_registration',
    });
    mockCreateAutoramp.mockImplementation(async () => {
      setAutoramps([
        { id: 'ar-new', walletAddress: '0xabc', status: 'Created' },
      ]);
      return { id: 'ar-new', walletAddress: '0xabc', status: 'Created' };
    });

    renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(mockCreateAutoramp).toHaveBeenCalledWith(
        expect.objectContaining({
          source_currencies: [{ type: 'Fiat', code: 'BRL' }],
        }),
      );
    });
  });

  it('opens the generic error when the region override has no currency', async () => {
    setAutoramps([]);
    mockLocation = 'BR';
    mockRegionOverride = 'DE';

    renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(mockNavigateToVbaOnboardingDestination).toHaveBeenCalledWith(
        expect.anything(),
        'accountCreateGeneric',
      );
    });
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
  });

  it('opens the generic error without creating when the country has no currency', async () => {
    setAutoramps([]);
    mockLocation = 'DE';

    renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(mockNavigateToVbaOnboardingDestination).toHaveBeenCalledWith(
        expect.anything(),
        'accountCreateGeneric',
      );
    });
    expect(mockHydrate).not.toHaveBeenCalled();
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
  });

  it('opens the generic error instead of replacing a rejected autoramp', async () => {
    setAutoramps([
      {
        id: 'ar-old',
        walletAddress: '0xabc',
        status: 'Rejected',
        depositRailsSummary: { currency: 'BRL' },
      },
    ]);
    mockHydrate.mockResolvedValue({ autorampStatus: 'needs_source_currency' });
    renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(mockNavigateToVbaOnboardingDestination).toHaveBeenCalledWith(
        expect.anything(),
        'accountCreateGeneric',
        undefined,
        undefined,
        'BRL',
      );
    });
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
  });

  it('keeps retryable setup failures retryable', async () => {
    setAutoramps([]);
    mockHydrate.mockResolvedValue({ autorampStatus: 'retryable_failure' });

    renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(mockNavigateToVbaOnboardingDestination).toHaveBeenCalledWith(
        expect.anything(),
        'accountCreateGeneric',
        undefined,
        undefined,
        'BRL',
        true,
      );
    });
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
  });

  it('opens the generic error when the autoramp is rejected after creation', async () => {
    setAutoramps([{ id: 'ar-1', walletAddress: '0xabc', status: 'Created' }]);
    mockRefreshAutoramp.mockResolvedValue({
      id: 'ar-1',
      walletAddress: '0xabc',
      status: 'Rejected',
    });

    renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(mockNavigateToVbaOnboardingDestination).toHaveBeenCalledWith(
        expect.anything(),
        'accountCreateGeneric',
        undefined,
        undefined,
        'BRL',
      );
    });
    expect(mockGetDepositInstructions).not.toHaveBeenCalled();
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
  });

  it.each(['RegistrationFailed', 'AuthorizationFailed'] as const)(
    'opens the verification error when refresh returns %s',
    async (status) => {
      setAutoramps([{ id: 'ar-1', walletAddress: '0xabc', status: 'Created' }]);
      mockRefreshAutoramp.mockResolvedValue({
        id: 'ar-1',
        walletAddress: '0xabc',
        status,
      });

      renderWithProvider(<VbaDetails />);

      await waitFor(() => {
        expect(mockNavigateToVbaOnboardingDestination).toHaveBeenCalledWith(
          expect.anything(),
          'accountCreateDetails',
          undefined,
          { httpStatus: 200, fiatStatus: status },
          'BRL',
        );
      });
      expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), {
        httpStatus: 200,
        fiatStatus: status,
      });
      expect(mockGetDepositInstructions).not.toHaveBeenCalled();
    },
  );

  it('skips PIX fetch when NeoBankService is unavailable', async () => {
    delete (Engine.context as unknown as EngineContextMock).NeoBankService;

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeOnTheScreen();
    });
    expect(mockGetDepositInstructions).not.toHaveBeenCalled();
  });

  it('registers and creates the autoramp in the country fiat once across StrictMode mounts', async () => {
    setAutoramps([]);
    mockHydrate.mockResolvedValue({
      autorampStatus: 'needs_wallet_registration',
    });
    const calls: string[] = [];
    mockRegisterWallet.mockImplementation(async () => {
      calls.push('register');
      return { type: 'alreadyRegistered' };
    });
    mockCreateAutoramp.mockImplementation(async () => {
      calls.push('create');
      setAutoramps([
        { id: 'ar-new', walletAddress: '0xabc', status: 'Created' },
      ]);
      return { id: 'ar-new', walletAddress: '0xabc', status: 'Created' };
    });
    mockGetDepositInstructions.mockResolvedValue(pixInstructions);

    renderWithProvider(
      <StrictMode>
        <VbaDetails />
      </StrictMode>,
    );

    await waitFor(() => {
      expect(mockCreateAutoramp).toHaveBeenCalledTimes(1);
    });
    expect(calls).toEqual(['register', 'create']);
    expect(mockCreateAutoramp).toHaveBeenCalledWith(
      expect.objectContaining({
        source_currencies: [{ type: 'Fiat', code: 'BRL' }],
      }),
    );
    await waitFor(() => {
      expect(mockGetDepositInstructions).toHaveBeenCalledWith('ar-new');
    });
  });

  it('refreshes an unlabeled approved account and creates USD when it is BRL', async () => {
    mockLocation = 'US';
    setAutoramps([{ id: 'ar-1', walletAddress: '0xabc', status: 'Approved' }]);
    mockRefreshAutoramp.mockImplementation(async () => {
      const stamped: TestAutoramp = {
        id: 'ar-1',
        walletAddress: '0xabc',
        status: 'Approved',
        depositRailsSummary: { currency: 'BRL' },
      };
      setAutoramps([stamped]);
      return stamped;
    });
    mockHydrate.mockResolvedValue({ autorampStatus: 'ready' });
    mockCreateAutoramp.mockImplementation(async () => {
      const created: TestAutoramp = {
        id: 'ar-usd',
        walletAddress: '0xabc',
        status: 'Created',
        depositRailsSummary: { currency: 'USD' },
      };
      setAutoramps([
        {
          id: 'ar-1',
          walletAddress: '0xabc',
          status: 'Approved',
          depositRailsSummary: { currency: 'BRL' },
        },
        created,
      ]);
      return created;
    });

    renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(mockCreateAutoramp).toHaveBeenCalledWith(
        expect.objectContaining({
          source_currencies: [{ type: 'Fiat', code: 'USD' }],
        }),
      );
    });
  });

  it('drops a details response that belongs to the previous currency', async () => {
    let resolvePix: (value: typeof pixInstructions) => void = () => undefined;
    mockStartVbaCufChildTrace.mockImplementation(
      () => `pix-fetch-${mockStartVbaCufChildTrace.mock.calls.length}`,
    );
    mockGetDepositInstructions.mockImplementation(
      (autorampId: string) =>
        new Promise((resolve) => {
          if (autorampId === 'ar-1') {
            resolvePix = resolve;
            return;
          }
          resolve(null);
        }),
    );
    mockRefreshAutoramp.mockImplementation(async (autorampId: string) => {
      const current = (
        Engine.context.RampsController.state as { autoramps: TestAutoramp[] }
      ).autoramps.find((autoramp) => autoramp.id === autorampId);
      return (
        current ?? { id: autorampId, walletAddress: '0xabc', status: 'Created' }
      );
    });
    const view = renderWithProvider(<VbaDetails />);
    await waitFor(() => {
      expect(mockGetDepositInstructions).toHaveBeenCalledWith('ar-1');
    });
    const brlTraceId = mockStartVbaCufChildTrace.mock.results.at(-1)?.value;
    mockRouteParams = { sourceCurrency: 'USD' };
    mockLocation = 'US';
    setAutoramps([]);
    mockHydrate.mockResolvedValue({ autorampStatus: 'needs_source_currency' });
    mockCreateAutoramp.mockImplementation(async () => {
      const created: TestAutoramp = {
        id: 'ar-usd',
        walletAddress: '0xabc',
        status: 'Approved',
        depositRailsSummary: { currency: 'USD' },
      };
      setAutoramps([created]);
      return created;
    });
    view.rerender(<VbaDetails />);
    expect(mockUseScreenPerformance).toHaveBeenCalledWith({
      config: VBA_SCREEN_PERFORMANCE_CONFIG,
      screenId: VBA_SCREEN_ID.ACCOUNT_DETAILS,
      resetKey: '0xabc:USD',
      enabled: false,
      contentReady: false,
      contentState: VBA_SCREEN_CONTENT_STATE.EMPTY,
    });
    await waitFor(() => {
      expect(mockGetDepositInstructions).toHaveBeenCalledWith('ar-usd');
    });
    resolvePix(pixInstructions);
    await act(async () => undefined);

    expect(mockEndVbaCufChildTrace.mock.calls[0]).toEqual([
      brlTraceId,
      false,
      VBA_CUF_END_REASON.SUPERSEDED,
    ]);
    expect(view.queryByText('00020126')).toBeNull();
    expect(
      view.queryByText(strings('virtual_bank_account.vba_details.title')),
    ).toBeNull();
  });

  it('creates the autoramp in the currency picked on Choose Currency', async () => {
    mockChooseCurrency = true;
    mockRouteParams = { sourceCurrency: 'USD' };
    setAutoramps([]);
    mockHydrate.mockResolvedValue({ autorampStatus: 'needs_source_currency' });

    renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(mockCreateAutoramp).toHaveBeenCalledWith(
        expect.objectContaining({
          source_currencies: [{ type: 'Fiat', code: 'USD' }],
        }),
      );
    });
  });

  it('ignores an EUR route param and does not create an account', async () => {
    mockChooseCurrency = true;
    mockRouteParams = { sourceCurrency: 'EUR' };
    setAutoramps([]);

    renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(mockNavigateToVbaOnboardingDestination).toHaveBeenCalledWith(
        expect.anything(),
        'accountCreateGeneric',
      );
    });
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
  });

  it('opens the generic error instead of using the region when chooseCurrency is on and no currency was picked', async () => {
    mockChooseCurrency = true;
    setAutoramps([]);

    renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(mockNavigateToVbaOnboardingDestination).toHaveBeenCalledWith(
        expect.anything(),
        'accountCreateGeneric',
      );
    });
    expect(mockHydrate).not.toHaveBeenCalled();
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
  });

  it('opens the generic error when account creation fails', async () => {
    setAutoramps([]);
    mockHydrate.mockResolvedValue({ autorampStatus: 'needs_source_currency' });
    mockCreateAutoramp.mockRejectedValue(new Error('create failed'));

    renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(mockNavigateToVbaOnboardingDestination).toHaveBeenCalledWith(
        expect.anything(),
        'accountCreateGeneric',
        undefined,
        undefined,
        'BRL',
      );
    });
    expect(mockCreateAutoramp).toHaveBeenCalledTimes(1);
  });

  it('keeps HTTP 500 account creation failures retryable', async () => {
    setAutoramps([]);
    mockHydrate.mockResolvedValue({ autorampStatus: 'needs_source_currency' });
    mockCreateAutoramp.mockRejectedValue({
      httpStatus: 500,
      traceId: 'moonpay-trace',
      body: 'account number 123456',
    });

    renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(mockNavigateToVbaOnboardingDestination).toHaveBeenCalledWith(
        expect.anything(),
        'accountCreateGeneric',
        undefined,
        { httpStatus: 500, traceId: 'moonpay-trace' },
        'BRL',
      );
    });
    expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), {
      httpStatus: 500,
      traceId: 'moonpay-trace',
    });
    expect(JSON.stringify(jest.mocked(Logger.error).mock.calls)).not.toContain(
      '123456',
    );
  });

  it('ignores an account creation failure after leaving the screen', async () => {
    let rejectCreate: ((reason: unknown) => void) | undefined;
    setAutoramps([]);
    mockHydrate.mockResolvedValue({ autorampStatus: 'needs_source_currency' });
    mockCreateAutoramp.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectCreate = reject;
      }),
    );
    const { unmount } = renderWithProvider(<VbaDetails />);
    await waitFor(() => expect(mockCreateAutoramp).toHaveBeenCalledTimes(1));

    unmount();
    await act(async () => rejectCreate?.({ httpStatus: 500 }));

    expect(mockNavigateToVbaOnboardingDestination).not.toHaveBeenCalled();
    expect(Logger.error).not.toHaveBeenCalled();
  });

  it('shows a load error when account details fail', async () => {
    mockGetDepositInstructions.mockRejectedValue(new Error('details failed'));

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.LOAD_ERROR)).toBeOnTheScreen();
    });
    expect(mockUseScreenPerformance).toHaveBeenCalledWith({
      config: VBA_SCREEN_PERFORMANCE_CONFIG,
      screenId: VBA_SCREEN_ID.ACCOUNT_DETAILS,
      resetKey: '0xabc:BRL',
      enabled: true,
      contentReady: true,
      contentState: VBA_SCREEN_CONTENT_STATE.ERROR,
    });
  });
});
