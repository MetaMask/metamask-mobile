import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import VbaSourceCurrency, {
  VbaSourceCurrencySelectorsIDs,
} from './VbaSourceCurrency';

const mockNavigate = jest.fn();
const mockRegisterWallet = jest.fn();
const mockCreateAutoramp = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
  }),
}));

jest.mock('../../../../../selectors/rampsController', () => ({
  selectSelectedVbaWalletAddress: () => '0xabc',
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
      registerMoneyAccountWallet: (...args: unknown[]) =>
        mockRegisterWallet(...args),
      createAutoramp: (...args: unknown[]) => mockCreateAutoramp(...args),
    },
  },
}));

describe('VbaSourceCurrency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRegisterWallet.mockResolvedValue({ type: 'alreadyRegistered' });
    mockCreateAutoramp.mockResolvedValue({
      id: 'autoramp-1',
      status: 'Created',
    });
  });

  it('renders the currency choice', () => {
    const { getByTestId, queryByTestId } = renderWithProvider(
      <VbaSourceCurrency />,
    );

    expect(getByTestId(VbaSourceCurrencySelectorsIDs.CONTAINER)).toBeTruthy();
    expect(getByTestId(VbaSourceCurrencySelectorsIDs.USD_BUTTON)).toBeTruthy();
    expect(getByTestId(VbaSourceCurrencySelectorsIDs.BRL_BUTTON)).toBeTruthy();
    expect(
      getByTestId(VbaSourceCurrencySelectorsIDs.CONTINUE_BUTTON),
    ).toBeTruthy();
    expect(queryByTestId(VbaSourceCurrencySelectorsIDs.CREATED)).toBeNull();
  });

  it('creates the autoramp for the chosen currency and shows its details', async () => {
    const { getByTestId } = renderWithProvider(<VbaSourceCurrency />);

    fireEvent.press(getByTestId(VbaSourceCurrencySelectorsIDs.BRL_BUTTON));
    fireEvent.press(getByTestId(VbaSourceCurrencySelectorsIDs.CONTINUE_BUTTON));

    await waitFor(() => {
      expect(getByTestId(VbaSourceCurrencySelectorsIDs.CREATED)).toBeTruthy();
    });

    expect(mockRegisterWallet).toHaveBeenCalledWith({ address: '0xabc' });
    expect(mockCreateAutoramp).toHaveBeenCalledWith(
      expect.objectContaining({
        source_currencies: [{ type: 'Fiat', code: 'BRL' }],
      }),
    );
    expect(getByTestId(VbaSourceCurrencySelectorsIDs.PIX_BUTTON)).toBeTruthy();
    expect(getByTestId(VbaSourceCurrencySelectorsIDs.DONE_BUTTON)).toBeTruthy();
    expect(mockCreateAutoramp).toHaveBeenCalledTimes(1);
  });
});
