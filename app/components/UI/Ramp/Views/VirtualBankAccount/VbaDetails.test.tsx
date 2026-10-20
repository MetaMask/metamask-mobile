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
import { resetBrazilMusdAutorampSetupGuard } from './ensureBrazilMusdAutoramp';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockGetPix = jest.fn();
const mockListTransactions = jest.fn();
const mockRefreshAutoramp = jest.fn();
const mockHydrate = jest.fn();
const mockRegisterWallet = jest.fn();
const mockCreateAutoramp = jest.fn();
let mockWalletAddress: string | null = '0xabc';
let mockDebugEnv: string | undefined;
let mockHardwareTier: 'LOW' | 'MID' | 'HIGH' | null;
let mockNetworkTier: 'NONE' | 'SLOW_CELLULAR' | 'FAST_CELLULAR' | 'WIFI' | null;

jest.mock('@react-native-clipboard/clipboard', () => ({
  setString: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../../selectors/rampsController', () => ({
  selectSelectedVbaWalletAddress: () => mockWalletAddress,
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
      getPixDepositInstructions: (...args: unknown[]) => mockGetPix(...args),
      listAutorampTransactions: (...args: unknown[]) =>
        mockListTransactions(...args),
    },
  },
}));

interface TestAutoramp {
  id: string;
  walletAddress: string;
  status: string;
}

const approvedAutoramp: TestAutoramp = {
  id: 'ar-1',
  walletAddress: '0xabc',
  status: 'Approved',
};

const pixInstructions = {
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
    getPixDepositInstructions: typeof mockGetPix;
    listAutorampTransactions: typeof mockListTransactions;
  };
}

const restoreNeoBankService = () => {
  (Engine.context as unknown as EngineContextMock).NeoBankService = {
    getPixDepositInstructions: mockGetPix,
    listAutorampTransactions: mockListTransactions,
  };
};

describe('VbaDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetBrazilMusdAutorampSetupGuard();
    mockWalletAddress = '0xabc';
    mockDebugEnv = undefined;
    mockHardwareTier = null;
    mockNetworkTier = null;
    mockGetPix.mockResolvedValue(null);
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
    const { getByTestId, getByText } = renderWithProvider(<VbaDetails />);

    expect(getByTestId(VbaDetailsSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.HEADER)).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.LOGO)).toHaveProp(
      'importantForAccessibility',
      'no',
    );
    expect(getByText('Add money with Pix')).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.HELPER_TEXT)).toHaveTextContent(
      strings('virtual_bank_account.vba_details.helper_text'),
    );
    await waitFor(() => {
      expect(mockGetPix).toHaveBeenCalledWith('ar-1');
    });
    expect(mockListTransactions).not.toHaveBeenCalled();
  });

  it('returns to Money home from the header', async () => {
    const { getByTestId, queryByTestId } = renderWithProvider(<VbaDetails />);
    await waitFor(() => {
      expect(mockGetPix).toHaveBeenCalledWith('ar-1');
    });

    fireEvent.press(getByTestId(VbaDetailsSelectorsIDs.BACK_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
    expect(queryByTestId('vba-details-done-button')).not.toBeOnTheScreen();
  });

  it('shows both Pix rows without leading key icons', async () => {
    mockGetPix.mockResolvedValue(pixInstructions);

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
    mockGetPix.mockResolvedValue(pixInstructions);

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

  it('shows a loading skeleton until Pix loads', async () => {
    let resolvePix: (value: typeof pixInstructions) => void = () => undefined;
    mockGetPix.mockReturnValue(
      new Promise((resolve) => {
        resolvePix = resolve;
      }),
    );

    const { getByTestId, queryByTestId } = renderWithProvider(<VbaDetails />);

    expect(getByTestId(VbaDetailsSelectorsIDs.LOADING)).toHaveProp(
      'accessibilityLabel',
      'Loading PIX details',
    );

    resolvePix(pixInstructions);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });
    expect(queryByTestId(VbaDetailsSelectorsIDs.LOADING)).not.toBeOnTheScreen();
  });

  it('shows Pix rows when the first fetch finishes after the network tier changes', async () => {
    let resolveFirst: (value: typeof pixInstructions) => void = () => undefined;
    mockGetPix
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
      expect(mockGetPix).toHaveBeenCalledWith('ar-1');
    });
    expect(getByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeOnTheScreen();
  });

  it('does not fetch Pix instructions while offline', () => {
    mockNetworkTier = 'NONE';

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    expect(mockGetPix).not.toHaveBeenCalled();
    expect(getByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeOnTheScreen();
  });

  it('hides the Pix key row when MoonPay omits it', async () => {
    mockGetPix.mockResolvedValue({
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
    mockGetPix.mockResolvedValue(pixInstructions);
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
    mockGetPix.mockResolvedValue(pixInstructions);
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
    mockGetPix.mockResolvedValue(pixInstructions);

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    expect(mockCreateAutoramp).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(mockRefreshAutoramp).toHaveBeenCalledWith('ar-1');
    });
    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });
  });

  it('shows a load error when refreshing the autoramp fails', async () => {
    setAutoramps([{ id: 'ar-1', walletAddress: '0xabc', status: 'Pending' }]);
    mockRefreshAutoramp.mockRejectedValue(new Error('refresh failed'));
    const announceSpy = jest.spyOn(
      AccessibilityInfo,
      'announceForAccessibility',
    );

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.LOAD_ERROR)).toBeOnTheScreen();
    });
    expect(getByTestId(VbaDetailsSelectorsIDs.LOAD_ERROR).props).toEqual(
      expect.objectContaining({
        accessibilityRole: 'alert',
        accessibilityLiveRegion: 'polite',
      }),
    );
    expect(announceSpy).toHaveBeenCalledWith(
      strings('virtual_bank_account.vba_details.load_error'),
    );
    expect(Logger.error).toHaveBeenCalled();
  });

  it('keeps loading when no usable autoramp exists and the customer is not active', async () => {
    setAutoramps([]);
    mockHydrate.mockResolvedValue({ autorampStatus: 'not_ready' });

    const { getByTestId, queryByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(mockHydrate).toHaveBeenCalled();
    });
    expect(getByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeOnTheScreen();
    expect(mockCreateAutoramp).not.toHaveBeenCalled();
    expect(mockGetPix).not.toHaveBeenCalled();
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.SETUP_ERROR),
    ).not.toBeOnTheScreen();
  });

  it('does nothing when no Money Account wallet is selected', async () => {
    mockWalletAddress = null;

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeOnTheScreen();
    });
    expect(mockGetPix).not.toHaveBeenCalled();
    expect(mockRefreshAutoramp).not.toHaveBeenCalled();
  });

  it('skips PIX fetch when NeoBankService is unavailable', async () => {
    delete (Engine.context as unknown as EngineContextMock).NeoBankService;

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.LOADING)).toBeOnTheScreen();
    });
    expect(mockGetPix).not.toHaveBeenCalled();
  });

  it('registers and creates the BRL autoramp once across StrictMode mounts', async () => {
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
    mockGetPix.mockResolvedValue(pixInstructions);

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
      expect(mockGetPix).toHaveBeenCalledWith('ar-new');
    });
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
    mockGetPix.mockResolvedValue(pixInstructions);

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.SETUP_ERROR)).toBeOnTheScreen();
    });
    expect(getByTestId(VbaDetailsSelectorsIDs.BACK_BUTTON)).toBeOnTheScreen();

    fireEvent.press(getByTestId(VbaDetailsSelectorsIDs.RETRY_BUTTON));

    await waitFor(() => {
      expect(mockGetPix).toHaveBeenCalledWith('ar-new');
    });
    expect(mockCreateAutoramp).toHaveBeenCalledTimes(2);
  });
});
