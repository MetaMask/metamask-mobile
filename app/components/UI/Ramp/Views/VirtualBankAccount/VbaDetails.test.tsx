import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaDetails, { VbaDetailsSelectorsIDs } from './VbaDetails';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();
const mockGetPix = jest.fn();
const mockListTransactions = jest.fn();
const mockRefreshAutoramp = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('../../../../../selectors/rampsController', () => ({
  selectSelectedVbaWalletAddress: () => '0xabc',
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

describe('VbaDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPix.mockResolvedValue(null);
    mockListTransactions.mockResolvedValue([]);
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
    mockGetPix.mockResolvedValue({
      brCode: '00020126',
      instruction: 'Pay with PIX',
      pixKey: 'pix@example.com',
    });
    mockListTransactions.mockResolvedValue([
      { id: 'tx-1', status: 'Completed' },
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
});
