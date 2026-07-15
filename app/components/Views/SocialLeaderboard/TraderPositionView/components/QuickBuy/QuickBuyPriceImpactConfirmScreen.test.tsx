import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';
import QuickBuyPriceImpactConfirmScreen from './QuickBuyPriceImpactConfirmScreen';
import { useQuickBuyContext } from './useQuickBuyContext';

jest.mock('./useQuickBuyContext', () => ({
  useQuickBuyContext: jest.fn(),
}));

jest.mock(
  '../../../../../UI/Bridge/components/PriceImpactModal/PriceImpactHeader',
  () => ({
    PriceImpactHeader: jest.fn(
      ({ onClose, content }: { onClose: () => void; content: string }) => {
        const { View, TouchableOpacity, Text } =
          jest.requireActual('react-native');
        return (
          <View testID="price-impact-header">
            <Text testID="price-impact-header-content">{content}</Text>
            <TouchableOpacity
              testID="price-impact-header-close"
              onPress={onClose}
            >
              <Text>Close</Text>
            </TouchableOpacity>
          </View>
        );
      },
    ),
  }),
);

jest.mock(
  '../../../../../UI/Bridge/components/PriceImpactModal/PriceImpactFooter',
  () => ({
    PriceImpactFooter: jest.fn(
      ({
        onConfirm,
        onCancel,
        loading,
      }: {
        type: string;
        onConfirm: () => void;
        onCancel: () => Promise<void>;
        loading: boolean;
      }) => {
        const { View, TouchableOpacity, Text } =
          jest.requireActual('react-native');
        return (
          <View testID="price-impact-footer">
            <TouchableOpacity testID="footer-cancel" onPress={onConfirm}>
              <Text>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="footer-proceed"
              onPress={onCancel}
              disabled={loading}
            >
              <Text>Proceed</Text>
            </TouchableOpacity>
          </View>
        );
      },
    ),
  }),
);

jest.mock('../../../../../UI/Bridge/hooks/usePriceImpactFiat', () => ({
  usePriceImpactFiat: jest.fn(),
}));

import { usePriceImpactFiat } from '../../../../../UI/Bridge/hooks/usePriceImpactFiat';

const buildContext = (overrides = {}) => ({
  activeQuote: undefined as unknown,
  formattedPriceImpact: '25.00%',
  setActiveScreen: jest.fn(),
  handleConfirm: jest.fn(),
  isSubmittingTx: false,
  ...overrides,
});

describe('QuickBuyPriceImpactConfirmScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useQuickBuyContext as jest.Mock).mockReturnValue(buildContext());
    (usePriceImpactFiat as jest.Mock).mockReturnValue(undefined);
  });

  it('renders the header with the error title', () => {
    render(<QuickBuyPriceImpactConfirmScreen />);
    expect(screen.getByTestId('price-impact-header-content')).toHaveTextContent(
      'bridge.price_impact_error_title',
    );
  });

  it('renders the description text with formatted price impact', () => {
    render(<QuickBuyPriceImpactConfirmScreen />);
    expect(screen.getByTestId('price-impact-description')).toBeOnTheScreen();
  });

  it('shows the fiat loss banner when fiat value is available', () => {
    (usePriceImpactFiat as jest.Mock).mockReturnValue('$19,997.62');
    render(<QuickBuyPriceImpactConfirmScreen />);
    expect(screen.getByTestId('price-impact-fiat-banner')).toBeOnTheScreen();
    expect(screen.getByTestId('price-impact-fiat-text')).toBeOnTheScreen();
  });

  it('hides the fiat loss banner when fiat value is unavailable', () => {
    (usePriceImpactFiat as jest.Mock).mockReturnValue(undefined);
    render(<QuickBuyPriceImpactConfirmScreen />);
    expect(
      screen.queryByTestId('price-impact-fiat-banner'),
    ).not.toBeOnTheScreen();
  });

  it('calls setActiveScreen("amount") when the close/cancel button is pressed', () => {
    const setActiveScreen = jest.fn();
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ setActiveScreen }),
    );
    render(<QuickBuyPriceImpactConfirmScreen />);
    fireEvent.press(screen.getByTestId('price-impact-header-close'));
    expect(setActiveScreen).toHaveBeenCalledWith('amount');
  });

  it('calls setActiveScreen("amount") when the footer Cancel button is pressed', () => {
    const setActiveScreen = jest.fn();
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ setActiveScreen }),
    );
    render(<QuickBuyPriceImpactConfirmScreen />);
    fireEvent.press(screen.getByTestId('footer-cancel'));
    expect(setActiveScreen).toHaveBeenCalledWith('amount');
  });

  it('calls handleConfirm when the footer Proceed button is pressed', async () => {
    const handleConfirm = jest.fn().mockResolvedValue(undefined);
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ handleConfirm }),
    );
    render(<QuickBuyPriceImpactConfirmScreen />);
    fireEvent.press(screen.getByTestId('footer-proceed'));
    await waitFor(() => expect(handleConfirm).toHaveBeenCalledTimes(1));
  });

  it('passes loading=true to the footer while handleConfirm is in-flight', async () => {
    let resolveConfirm!: () => void;
    const handleConfirm = jest.fn(
      () =>
        new Promise<void>((res) => {
          resolveConfirm = res;
        }),
    );
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ handleConfirm }),
    );

    const { PriceImpactFooter } = jest.requireMock(
      '../../../../../UI/Bridge/components/PriceImpactModal/PriceImpactFooter',
    ) as { PriceImpactFooter: jest.Mock };

    render(<QuickBuyPriceImpactConfirmScreen />);
    fireEvent.press(screen.getByTestId('footer-proceed'));

    await waitFor(() => {
      const lastCall = PriceImpactFooter.mock.calls.at(-1)?.[0];
      expect(lastCall?.loading).toBe(true);
    });

    await act(async () => {
      resolveConfirm();
    });

    await waitFor(() => {
      const lastCall = PriceImpactFooter.mock.calls.at(-1)?.[0];
      expect(lastCall?.loading).toBe(false);
    });
  });

  it('passes loading=true to the footer when isSubmittingTx is true', () => {
    (useQuickBuyContext as jest.Mock).mockReturnValue(
      buildContext({ isSubmittingTx: true }),
    );

    const { PriceImpactFooter } = jest.requireMock(
      '../../../../../UI/Bridge/components/PriceImpactModal/PriceImpactFooter',
    ) as { PriceImpactFooter: jest.Mock };

    render(<QuickBuyPriceImpactConfirmScreen />);

    const lastCall = PriceImpactFooter.mock.calls.at(-1)?.[0];
    expect(lastCall?.loading).toBe(true);
  });
});
