import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import Engine from '../../../../../core/Engine';
import Logger from '../../../../../util/Logger';
import VbaDetails, {
  pickLatestTransaction,
  VbaDetailsSelectorsIDs,
} from './VbaDetails';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockGetPix = jest.fn();
const mockListTransactions = jest.fn();
const mockRefreshAutoramp = jest.fn();
let mockWalletAddress: string | null = '0xabc';

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../../selectors/rampsController', () => ({
  selectSelectedVbaWalletAddress: () => mockWalletAddress,
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
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

describe('pickLatestTransaction', () => {
  it('returns undefined for an empty list', () => {
    expect(pickLatestTransaction([])).toBeUndefined();
  });

  it('prefers the newest createdAt over array order', () => {
    const latest = pickLatestTransaction([
      { id: 'old', status: 'Completed', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'new', status: 'Pending', createdAt: '2026-06-01T00:00:00Z' },
    ]);

    expect(latest?.id).toBe('new');
  });

  it('prefers an in-flight status when timestamps are missing', () => {
    const latest = pickLatestTransaction([
      { id: 'done', status: 'Completed' },
      { id: 'pending', status: 'Pending' },
    ]);

    expect(latest?.id).toBe('pending');
  });

  it('falls back to the last terminal transaction when all are terminal', () => {
    const latest = pickLatestTransaction([
      { id: 'first', status: 'Failed' },
      { id: 'last', status: 'Completed' },
    ]);

    expect(latest?.id).toBe('last');
  });

  it('ignores invalid createdAt values', () => {
    const latest = pickLatestTransaction([
      { id: 'bad', status: 'Completed', createdAt: 'not-a-date' },
      { id: 'pending', status: 'Pending' },
    ]);

    expect(latest?.id).toBe('pending');
  });
});

describe('VbaDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockWalletAddress = '0xabc';
    mockGetPix.mockResolvedValue(null);
    mockListTransactions.mockResolvedValue([]);
    mockRefreshAutoramp.mockResolvedValue(approvedAutoramp);
    setAutoramps([{ ...approvedAutoramp }]);
  });

  it('renders the details screen', async () => {
    const { getByTestId } = renderWithProvider(<VbaDetails />);

    expect(getByTestId(VbaDetailsSelectorsIDs.CONTAINER)).toBeOnTheScreen();
    await waitFor(() => {
      expect(mockGetPix).toHaveBeenCalledWith('ar-1');
    });
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

  it('shows the PIX code and a completed deposit', async () => {
    mockGetPix.mockResolvedValue(pixInstructions);
    mockListTransactions.mockResolvedValue([
      { id: 'tx-1', status: 'Completed', createdAt: '2026-06-01T00:00:00Z' },
    ]);

    const { getByText, getByTestId } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });
    expect(getByText('00020126')).toBeOnTheScreen();
    expect(getByText('pix@example.com')).toBeOnTheScreen();
    expect(
      getByTestId(VbaDetailsSelectorsIDs.TRANSACTION_STATUS),
    ).toBeOnTheScreen();
    expect(mockGetPix).toHaveBeenCalledWith('ar-1');
    expect(mockRefreshAutoramp).not.toHaveBeenCalled();
  });

  it('shows PIX without a pix key when MoonPay omits it', async () => {
    mockGetPix.mockResolvedValue({
      brCode: '00020126',
      instruction: 'Pay with PIX',
    });

    const { getByTestId, queryByText } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });
    expect(queryByText('pix@example.com')).toBeNull();
  });

  it('shows the newest transaction status when an older completed exists', async () => {
    mockGetPix.mockResolvedValue(pixInstructions);
    mockListTransactions.mockResolvedValue([
      { id: 'tx-old', status: 'Completed', createdAt: '2026-01-01T00:00:00Z' },
      { id: 'tx-new', status: 'Pending', createdAt: '2026-06-01T00:00:00Z' },
    ]);

    const { getByTestId, getByText } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(
        getByTestId(VbaDetailsSelectorsIDs.TRANSACTION_STATUS),
      ).toBeOnTheScreen();
    });
    expect(getByText(/Pending/)).toBeOnTheScreen();
  });

  it('keeps the PIX code when listing transactions fails', async () => {
    mockGetPix.mockResolvedValue(pixInstructions);
    mockListTransactions.mockRejectedValue(new Error('tx poll failed'));

    const { getByTestId, getByText, queryByText } = renderWithProvider(
      <VbaDetails />,
    );

    await waitFor(() => {
      expect(getByTestId(VbaDetailsSelectorsIDs.PIX_CODE)).toBeOnTheScreen();
    });
    expect(getByText('00020126')).toBeOnTheScreen();
    expect(queryByText(/Couldn't refresh the deposit/)).toBeNull();
    expect(Logger.error).toHaveBeenCalled();
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

    const { getByText } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(
        getByText("Couldn't refresh the deposit. We'll try again."),
      ).toBeOnTheScreen();
    });
    expect(Logger.error).toHaveBeenCalled();
  });

  it('waits for PIX when no usable autoramp exists', async () => {
    setAutoramps([]);

    const { getByText } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(
        getByText('PIX instructions appear here once the account is approved.'),
      ).toBeOnTheScreen();
    });
    expect(mockGetPix).not.toHaveBeenCalled();
  });

  it('does nothing when no Money Account wallet is selected', async () => {
    mockWalletAddress = null;

    const { getByText } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(
        getByText('PIX instructions appear here once the account is approved.'),
      ).toBeOnTheScreen();
    });
    expect(mockGetPix).not.toHaveBeenCalled();
    expect(mockRefreshAutoramp).not.toHaveBeenCalled();
  });

  it('skips PIX fetch when NeoBankService is unavailable', async () => {
    delete (Engine.context as { NeoBankService?: unknown }).NeoBankService;

    const { getByText } = renderWithProvider(<VbaDetails />);

    await waitFor(() => {
      expect(
        getByText('PIX instructions appear here once the account is approved.'),
      ).toBeOnTheScreen();
    });
    expect(mockGetPix).not.toHaveBeenCalled();
  });
});
