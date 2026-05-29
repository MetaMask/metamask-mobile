import React from 'react';
import {
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

// Mock Bridge sub-components as lightweight stubs so we can inspect props.
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
  '../../../../../UI/Bridge/components/PriceImpactModal/PriceImpactDescription',
  () => ({
    PriceImpactDescription: jest.fn(
      ({
        content,
        formattedPriceImpact,
        formattedPriceImpactFiat,
      }: {
        content: string;
        formattedPriceImpact?: string;
        formattedPriceImpactFiat?: string;
        isDanger: boolean;
      }) => {
        const { View, Text } = jest.requireActual('react-native');
        return (
          <View testID="price-impact-description">
            <Text testID="price-impact-description-content">{content}</Text>
            {formattedPriceImpact && (
              <Text testID="price-impact-description-percent">
                {formattedPriceImpact}
              </Text>
            )}
            {formattedPriceImpactFiat && (
              <Text testID="price-impact-description-fiat">
                {formattedPriceImpactFiat}
              </Text>
            )}
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
import {
  IconColor,
  IconName,
  TextColor,
} from '@metamask/design-system-react-native';

const buildContext = (overrides = {}) => ({
  activeQuote: undefined as unknown,
  formattedPriceImpact: '25.00%',
  priceImpactViewData: {
    textColor: TextColor.ErrorDefault,
    icon: {
      name: IconName.Danger,
      color: IconColor.ErrorDefault,
    },
    title: 'bridge.price_impact_error_title',
    description: 'bridge.price_impact_error_description',
  },
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

  it('renders the description with the formatted price impact', () => {
    render(<QuickBuyPriceImpactConfirmScreen />);
    expect(
      screen.getByTestId('price-impact-description-percent'),
    ).toHaveTextContent('25.00%');
  });

  it('shows the fiat loss banner when fiat value is available', () => {
    (usePriceImpactFiat as jest.Mock).mockReturnValue('$19,997.62');
    render(<QuickBuyPriceImpactConfirmScreen />);
    expect(
      screen.getByTestId('price-impact-description-fiat'),
    ).toHaveTextContent('$19,997.62');
  });

  it('hides the fiat loss banner when fiat value is unavailable', () => {
    (usePriceImpactFiat as jest.Mock).mockReturnValue(undefined);
    render(<QuickBuyPriceImpactConfirmScreen />);
    expect(
      screen.queryByTestId('price-impact-description-fiat'),
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
});
