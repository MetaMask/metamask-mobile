import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import { strings } from '../../../../../../locales/i18n';
import VbaDetails, { VbaDetailsSelectorsIDs } from './VbaDetails';
import { VbaDepositDebugSelectorsIDs } from './VbaDepositDebugSheet';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockGetPix = jest.fn();
const mockListTransactions = jest.fn();
const mockRefreshAutoramp = jest.fn();
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
    mockWalletAddress = '0xabc';
    mockDebugEnv = undefined;
    mockHardwareTier = null;
    mockNetworkTier = null;
    mockGetPix.mockResolvedValue(null);
    mockListTransactions.mockResolvedValue([]);
    mockRefreshAutoramp.mockResolvedValue(approvedAutoramp);
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
    await waitFor(() => {
      expect(mockGetPix).toHaveBeenCalledWith('ar-1');
    });
    expect(mockListTransactions).not.toHaveBeenCalled();
  });

  it('navigates to Money home when done is pressed', async () => {
    const { getByTestId } = renderWithProvider(<VbaDetails />);
    await waitFor(() => {
      expect(mockGetPix).toHaveBeenCalledWith('ar-1');
    });

    fireEvent.press(getByTestId(VbaDetailsSelectorsIDs.DONE_BUTTON));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.HOME_TABS, {
      screen: Routes.MONEY.ROOT,
      params: { screen: Routes.MONEY.HOME },
    });
  });

  it('shows both Pix rows with a key icon', async () => {
    mockGetPix.mockResolvedValue(pixInstructions);

    const { getByLabelText, getByTestId, getByText } = renderWithProvider(
      <VbaDetails />,
    );

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });
    expect(getByText('PIX Copia e Cola')).toBeOnTheScreen();
    expect(getByText('00020126')).toBeOnTheScreen();
    expect(getByTestId(VbaDetailsSelectorsIDs.PIX_KEY)).toBeOnTheScreen();
    expect(getByText('PIX key')).toBeOnTheScreen();
    expect(getByText('pix@example.com')).toBeOnTheScreen();
    const copiaColaIcon = getByTestId(
      `${VbaDetailsSelectorsIDs.ROW_ICON}-copia-cola`,
      { includeHiddenElements: true },
    );
    const pixKeyIcon = getByTestId(
      `${VbaDetailsSelectorsIDs.ROW_ICON}-pix-key`,
      { includeHiddenElements: true },
    );
    expect(copiaColaIcon).toHaveProp(
      'importantForAccessibility',
      'no-hide-descendants',
    );
    expect(pixKeyIcon).toHaveProp(
      'importantForAccessibility',
      'no-hide-descendants',
    );
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

  it('shows a loading skeleton instead of the waiting copy until Pix loads', async () => {
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
    expect(
      queryByTestId(VbaDetailsSelectorsIDs.WAITING_FOR_PIX),
    ).not.toBeOnTheScreen();

    resolvePix(pixInstructions);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });
    expect(queryByTestId(VbaDetailsSelectorsIDs.LOADING)).not.toBeOnTheScreen();
  });

  it('shows the waiting copy once the backend returns no Pix code', async () => {
    const { getByTestId, queryByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(
        getByTestId(VbaDetailsSelectorsIDs.WAITING_FOR_PIX),
      ).toBeOnTheScreen();
    });
    expect(queryByTestId(VbaDetailsSelectorsIDs.LOADING)).not.toBeOnTheScreen();
  });

  it('does not fetch Pix instructions while offline', () => {
    mockNetworkTier = 'NONE';

    const { getByTestId, queryByTestId } = renderWithProvider(<VbaDetails />);

    expect(mockGetPix).not.toHaveBeenCalled();
    expect(queryByTestId(VbaDetailsSelectorsIDs.LOADING)).not.toBeOnTheScreen();
    expect(
      getByTestId(VbaDetailsSelectorsIDs.WAITING_FOR_PIX),
    ).toBeOnTheScreen();
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

  it('waits for PIX when no usable autoramp exists', async () => {
    setAutoramps([]);

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(
        getByTestId(VbaDetailsSelectorsIDs.WAITING_FOR_PIX),
      ).toBeOnTheScreen();
    });
    expect(mockGetPix).not.toHaveBeenCalled();
  });

  it('does nothing when no Money Account wallet is selected', async () => {
    mockWalletAddress = null;

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(
        getByTestId(VbaDetailsSelectorsIDs.WAITING_FOR_PIX),
      ).toBeOnTheScreen();
    });
    expect(mockGetPix).not.toHaveBeenCalled();
    expect(mockRefreshAutoramp).not.toHaveBeenCalled();
  });

  it('skips PIX fetch when NeoBankService is unavailable', async () => {
    delete (Engine.context as unknown as EngineContextMock).NeoBankService;

    const { getByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(
        getByTestId(VbaDetailsSelectorsIDs.WAITING_FOR_PIX),
      ).toBeOnTheScreen();
    });
    expect(mockGetPix).not.toHaveBeenCalled();
  });
});
