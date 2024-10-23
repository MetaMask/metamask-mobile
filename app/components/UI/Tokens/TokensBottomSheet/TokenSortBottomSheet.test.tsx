import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import TokenSortBottomSheet from './TokenSortBottomSheet';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectTokenSortConfig } from '../../../../selectors/preferencesController';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';

// Mock useSelector and useTheme
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
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('react-native-safe-area-context', () => {
  // using disting digits for mock rects to make sure they are not mixed up
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
    const { getByText } = render(<TokenSortBottomSheet />);

    expect(getByText('Sort By')).toBeTruthy();
    expect(getByText('Declining balance (USD high-low)')).toBeTruthy();
    expect(getByText('Alphabetically (A-Z)')).toBeTruthy();
  });

  it('triggers PreferencesController to sort by token fiat amount when first cell is pressed', async () => {
    const { getByText } = render(<TokenSortBottomSheet />);

    fireEvent.press(getByText('Declining balance (USD high-low)'));

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
    const { getByText } = render(<TokenSortBottomSheet />);

    fireEvent.press(getByText('Alphabetically (A-Z)'));

    await waitFor(() => {
      expect(
        Engine.context.PreferencesController.setTokenSortConfig,
      ).toHaveBeenCalledWith({
        key: 'symbol',
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

    const { getByText } = render(<TokenSortBottomSheet />);

    expect(getByText('Alphabetically (A-Z)')).toBeTruthy();
  });
});
