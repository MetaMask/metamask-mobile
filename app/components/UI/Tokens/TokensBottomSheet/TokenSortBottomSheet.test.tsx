import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TokenSortBottomSheet } from './TokenSortBottomSheet';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectTokenSortConfig } from '../../../../selectors/preferencesController';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import { WalletViewSelectorsIDs } from '../../../../../e2e/selectors/wallet/WalletView.selectors';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../../../core/Engine', () => ({
  context: {
    PreferencesController: {
      setTokenSortConfig: jest.fn(),
    },
  },
}));

jest.mock('@react-navigation/native', () => {
  const reactNavigationModule = jest.requireActual('@react-navigation/native');
  return {
    ...reactNavigationModule,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  // copied from BottomSheetDialog.test.tsx
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  const frame = { width: 5, height: 6, x: 7, y: 8 };
  return {
    SafeAreaProvider: jest.fn().mockImplementation(({ children }) => children),
    SafeAreaConsumer: jest
      .fn()
      .mockImplementation(({ children }) => children(inset)),
    useSafeAreaInsets: jest.fn().mockImplementation(() => inset),
    useSafeAreaFrame: jest.fn().mockImplementation(() => frame),
  };
});

describe('TokenSortBottomSheet', () => {
  beforeEach(() => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectTokenSortConfig) {
        return {
          key: 'tokenFiatAmount',
          order: 'dsc',
          sortCallback: 'stringNumeric',
        }; // Default token sort config
      } else if (selector === selectCurrentCurrency) {
        return 'USD';
      }
      return null;
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with the default sort option selected', () => {
    const { queryByTestId } = render(<TokenSortBottomSheet />);

    expect(queryByTestId(WalletViewSelectorsIDs.SORT_BY)).toBeTruthy();
    expect(
      queryByTestId(WalletViewSelectorsIDs.SORT_DECLINING_BALANCE),
    ).toBeTruthy();
    expect(
      queryByTestId(WalletViewSelectorsIDs.SORT_ALPHABETICAL),
    ).toBeTruthy();
  });

  it('triggers PreferencesController to sort by token fiat amount when first cell is pressed', async () => {
    const { getByTestId } = render(<TokenSortBottomSheet />);

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.SORT_DECLINING_BALANCE));

    await waitFor(() => {
      expect(
        Engine.context.PreferencesController.setTokenSortConfig,
      ).toHaveBeenCalledWith({
        key: 'tokenFiatAmount',
        order: 'dsc',
        sortCallback: 'stringNumeric',
      });
    });
  });

  it('triggers PreferencesController to sort alphabetically when the second cell is pressed', async () => {
    const { getByTestId } = render(<TokenSortBottomSheet />);

    fireEvent.press(getByTestId(WalletViewSelectorsIDs.SORT_ALPHABETICAL));

    await waitFor(() => {
      expect(
        Engine.context.PreferencesController.setTokenSortConfig,
      ).toHaveBeenCalledWith({
        key: 'name',
        sortCallback: 'alphaNumeric',
        order: 'asc',
      });
    });
  });

  it('displays the correct selection based on tokenSortConfig', () => {
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectTokenSortConfig) {
        return { key: 'symbol', order: 'dsc', sortCallback: 'stringNumeric' };
      }
      return null;
    });

    const { queryByTestId } = render(<TokenSortBottomSheet />);

    expect(
      queryByTestId(WalletViewSelectorsIDs.SORT_ALPHABETICAL),
    ).toBeTruthy();
  });
});
