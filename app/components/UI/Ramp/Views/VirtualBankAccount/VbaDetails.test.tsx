import React, { StrictMode } from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { strings } from '../../../../../../locales/i18n';
import VbaDetails, { VbaDetailsSelectorsIDs } from './VbaDetails';
import { VbaDepositDebugSelectorsIDs } from './VbaDepositDebugSheet';
import { resetMusdAutorampSetupGuard } from './ensureMusdAutoramp';
import { VbaCreatingAccountSelectorsIDs } from './VbaCreatingAccount';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetDepositInstructions = jest.fn();
const mockListTransactions = jest.fn();
const mockRefreshAutoramp = jest.fn();
const mockHydrate = jest.fn();
const mockRegisterWallet = jest.fn();
const mockCreateAutoramp = jest.fn();
let mockWalletAddress: string | null = '0xabc';
let mockLocation: string | undefined = 'BR';
let mockRouteParams: { sourceCurrency?: string } | undefined;
let mockChooseCurrency = false;
let mockRegionOverride: string | undefined;
let mockDebugEnv: string | undefined;
let mockHardwareTier: 'LOW' | 'MID' | 'HIGH' | null;
let mockNetworkTier: 'NONE' | 'SLOW_CELLULAR' | 'FAST_CELLULAR' | 'WIFI' | null;
let mockCanGoBack = true;

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    canGoBack: () => mockCanGoBack,
    goBack: mockGoBack,
    navigate: mockNavigate,
  }),
  useRoute: () => ({ params: mockRouteParams }),
}));

jest.mock('../../../../../selectors/rampsController', () => ({
  selectSelectedVbaWalletAddress: () => mockWalletAddress,
}));

jest.mock(
  '../../../../../selectors/featureFlagController/moneyAccount',
  () => ({
    ...jest.requireActual(
      '../../../../../selectors/featureFlagController/moneyAccount',
    ),
    selectMoneyMovementNeobank: () => ({
      isEnabled: true,
      regions: ['BR', 'US'],
      regionCurrencies: { BR: 'BRL', US: 'USD' },
      defaultCurrency: undefined,
      chooseCurrency: mockChooseCurrency,
      regionOverride: mockRegionOverride,
    }),
  }),
);

jest.mock('../../../../../selectors/geolocationController', () => ({
  selectGeolocationLocation: () => mockLocation,
}));

jest.mock('../../../../../util/deviceCapability', () => ({
  getHardwareTier: () => mockHardwareTier,
}));

jest.mock('../../../../../hooks/useNetworkTier', () => ({
  useNetworkTier: () => mockNetworkTier,
}));

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

jest.mock('../../../../../core/Engine', () => ({
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
    resetMusdAutorampSetupGuard();
    mockWalletAddress = '0xabc';
    mockLocation = 'BR';
    mockRouteParams = undefined;
    mockChooseCurrency = false;
    mockRegionOverride = undefined;
    mockDebugEnv = undefined;
    mockHardwareTier = null;
    mockNetworkTier = null;
    mockCanGoBack = true;
    mockGetDepositInstructions.mockResolvedValue(null);
    mockListTransactions.mockResolvedValue([]);
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
    const { getByTestId, queryByTestId } = renderWithProvider(<VbaDetails />);

    expect(getByTestId(VbaDetailsSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.HEADER)).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.LOGO)).toHaveProp(
      'importantForAccessibility',
      'no',
    );
    expect(getByTestId(VbaDetailsSelectorsIDs.TITLE)).toHaveTextContent(
      strings('virtual_bank_account.vba_details.title'),
    );
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.HELPER_TEXT),
    ).not.toBeOnTheScreen();
    await waitFor(() => {
      expect(mockGetDepositInstructions).toHaveBeenCalledWith('ar-1');
    });
    expect(mockListTransactions).not.toHaveBeenCalled();
  });

  it('returns to the caller from the header', async () => {
    const { getByTestId, queryByTestId } = renderWithProvider(<VbaDetails />);
    await waitFor(() => {
      expect(mockGetDepositInstructions).toHaveBeenCalledWith('ar-1');
    });

    fireEvent.press(getByTestId(VbaDetailsSelectorsIDs.BACK_BUTTON));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(queryByTestId('vba-details-done-button')).not.toBeOnTheScreen();
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

  it('shows both Pix rows without leading key icons', async () => {
    mockGetDepositInstructions.mockResolvedValue(pixInstructions);

    const { getByLabelText, getByTestId, getByText, queryByTestId } =
      renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });
    expect(getByText('PIX Copia e Cola')).toBeOnTheScreen();
    expect(getByText('00020126')).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.PIX_KEY)).toBeOnTheScreen();
    expect(getByText('PIX key')).toBeOnTheScreen();
    expect(getByText('pix@example.com')).toBeOnTheScreen();
    expect(
      queryByTestId('vba-details-row-icon-copia-cola'),
    ).not.toBeOnTheScreen();
    expect(queryByTestId('vba-details-row-icon-pix-key')).not.toBeOnTheScreen();
    expect(getByLabelText('Copy PIX Copia e Cola')).toBeOnTheScreen();
    expect(getByLabelText('Copy PIX key')).toBeOnTheScreen();
    expect(mockRefreshAutoramp).not.toHaveBeenCalled();
    expect(mockListTransactions).not.toHaveBeenCalled();
  });

  it('copies a Pix value', async () => {
    mockGetDepositInstructions.mockResolvedValue(pixInstructions);

    const { getByLabelText, getByTestId } = renderWithProvider(<VbaDetails />);
    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_KEY)).toBeOnTheScreen();
    });

    fireEvent.press(getByLabelText('Copy PIX key'));

    expect(Clipboard.setString).toHaveBeenCalledWith('pix@example.com');
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledWith(
      'Copied PIX key',
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
    mockListTransactions.mockRejectedValue(new Error('tx poll failed'));

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
    mockListTransactions.mockResolvedValue([
      { id: 'tx-old', status: 'Completed', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'tx-new', status: 'Pending', createdAt: '2026-06-01T00:00:00Z' },
    ]);

    const { getByTestId, getByText } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(mockListTransactions).toHaveBeenCalledWith('ar-1');
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
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.SETUP_ERROR),
    ).not.toBeOnTheScreen();
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

  it('does not use the IP currency when the region override has no currency', async () => {
    setAutoramps([]);
    mockLocation = 'BR';
    mockRegionOverride = 'DE';

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.SETUP_ERROR)).toBeOnTheScreen();
    });
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
  });

  it('shows the setup error without creating when the country has no currency', async () => {
    setAutoramps([]);
    mockLocation = 'DE';

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.SETUP_ERROR)).toBeOnTheScreen();
    });
    expect(mockHydrate).not.toHaveBeenCalled();
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
  });

  it('shows retry instead of replacing a rejected autoramp, and replaces it on retry', async () => {
    setAutoramps([
      {
        id: 'ar-old',
        walletAddress: '0xabc',
        status: 'Rejected',
        depositRailsSummary: { currency: 'BRL' },
      },
    ]);
    mockHydrate.mockResolvedValue({ autorampStatus: 'needs_source_currency' });
    mockCreateAutoramp.mockImplementation(async () => {
      setAutoramps([
        { id: 'ar-old', walletAddress: '0xabc', status: 'Rejected' },
        { id: 'ar-new', walletAddress: '0xabc', status: 'Created' },
      ]);
      return { id: 'ar-new', walletAddress: '0xabc', status: 'Created' };
    });
    mockGetDepositInstructions.mockResolvedValue(pixInstructions);
    const announceSpy = jest.spyOn(
      AccessibilityInfo,
      'announceForAccessibility',
    );

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.SETUP_ERROR)).toBeOnTheScreen();
    });
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
    expect(announceSpy).toHaveBeenCalledWith(
      strings('virtual_bank_account.vba_details.setup_error'),
    );

    fireEvent.press(getByTestId(VbaDetailsSelectorsIDs.RETRY_BUTTON));

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });
    expect(mockCreateAutoramp).toHaveBeenCalledTimes(1);
  });

  it('shows retry when the autoramp is rejected after creation', async () => {
    setAutoramps([{ id: 'ar-1', walletAddress: '0xabc', status: 'Created' }]);
    mockRefreshAutoramp.mockResolvedValue({
      id: 'ar-1',
      walletAddress: '0xabc',
      status: 'Rejected',
    });

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(
        getByTestId(VbaDetailsSelectorsIDs.RETRY_BUTTON),
      ).toBeOnTheScreen();
    });
    expect(mockGetDepositInstructions).not.toHaveBeenCalled();
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
  });

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
      expect(mockCreateAutoramp).toHaveBeenCalledTimes(1);
    });
    expect(mockCreateAutoramp).toHaveBeenCalledWith(
      expect.objectContaining({
        source_currencies: [{ type: 'Fiat', code: 'USD' }],
      }),
    );
  });

  it('drops a details response that belongs to the previous currency', async () => {
    let resolvePix: (value: typeof pixInstructions) => void = () => undefined;
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

    mockRouteParams = { sourceCurrency: 'USD' };
    mockLocation = 'US';
    setAutoramps([]);
    mockHydrate.mockResolvedValue({ autorampStatus: 'needs_source_currency' });
    mockCreateAutoramp.mockImplementation(async () => {
      const created: TestAutoramp = {
        id: 'ar-usd',
        walletAddress: '0xabc',
        status: 'Created',
        depositRailsSummary: { currency: 'USD' },
      };
      setAutoramps([created]);
      return created;
    });
    view.rerender(<VbaDetails />);
    resolvePix(pixInstructions);

    await waitFor(() => {
      expect(mockCreateAutoramp).toHaveBeenCalledWith(
        expect.objectContaining({
          source_currencies: [{ type: 'Fiat', code: 'USD' }],
        }),
      );
    });
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

    const { findByTestId } = renderWithProvider(<VbaDetails />);

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.SETUP_ERROR),
    ).toBeOnTheScreen();
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
  });

  it('shows the setup error instead of using the region when chooseCurrency is on and no currency was picked', async () => {
    mockChooseCurrency = true;
    setAutoramps([]);

    const { findByTestId } = renderWithProvider(<VbaDetails />);

    expect(
      await findByTestId(VbaDetailsSelectorsIDs.SETUP_ERROR),
    ).toBeOnTheScreen();
    expect(mockHydrate).not.toHaveBeenCalled();
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
  });

  it('stays on details with retry when setup fails', async () => {
    setAutoramps([]);
    mockHydrate.mockResolvedValue({ autorampStatus: 'needs_source_currency' });
    mockCreateAutoramp
      .mockRejectedValueOnce(new Error('create failed'))
      .mockImplementation(async () => {
        setAutoramps([
          { id: 'ar-new', walletAddress: '0xabc', status: 'Created' },
        ]);
        return { id: 'ar-new', walletAddress: '0xabc', status: 'Created' };
      });
    mockGetDepositInstructions.mockResolvedValue(pixInstructions);

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.SETUP_ERROR)).toBeOnTheScreen();
    });
    expect(getByTestId(VbaDetailsSelectorsIDs.BACK_BUTTON)).toBeOnTheScreen();

    fireEvent.press(getByTestId(VbaDetailsSelectorsIDs.RETRY_BUTTON));

    await waitFor(() => {
      expect(mockGetDepositInstructions).toHaveBeenCalledWith('ar-new');
    });
    expect(mockCreateAutoramp).toHaveBeenCalledTimes(2);
  });

  it('shows a load error when retry creates the account but details fail', async () => {
    setAutoramps([]);
    mockHydrate.mockResolvedValue({ autorampStatus: 'needs_source_currency' });
    mockCreateAutoramp
      .mockRejectedValueOnce(new Error('create failed'))
      .mockImplementation(async () => {
        const created = {
          id: 'ar-new',
          walletAddress: '0xabc',
          status: 'Approved',
          depositRailsSummary: { currency: 'BRL' },
        };
        setAutoramps([created]);
        return created;
      });
    mockGetDepositInstructions.mockRejectedValue(new Error('details failed'));

    const { findByTestId, getByTestId, queryByTestId } = renderWithProvider(
      <VbaDetails />,
    );

    fireEvent.press(await findByTestId(VbaDetailsSelectorsIDs.RETRY_BUTTON));

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.LOAD_ERROR)).toBeOnTheScreen();
    });
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.SETUP_ERROR),
    ).not.toBeOnTheScreen();
  });
});
