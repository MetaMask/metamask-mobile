import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import ReviewOrder from './ReviewOrder';
import { ReviewOrderSelectors } from '../../../../../../e2e/selectors/Card/ReviewOrder.selectors';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';

const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
}));

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  MetaMetricsEvents: {
    CARD_VIEWED: 'Card Viewed',
    CARD_BUTTON_CLICKED: 'Card Button Clicked',
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'card.review_order.title': 'Review your order',
      'card.review_order.subtitle':
        'We can only ship to residential addresses.',
      'card.review_order.shipping_address': 'Shipping address',
      'card.review_order.edit': 'Edit',
      'card.review_order.metal_card_quantity': '1 Metal Card',
      'card.review_order.metal_card_price': '$199',
      'card.review_order.metal_card_total': '$199 per year',
      'card.review_order.fees': 'Fees',
      'card.review_order.fees_free': 'Free',
      'card.review_order.renews': 'Renews',
      'card.review_order.renews_annually': 'Annually',
      'card.review_order.total': 'Total',
      'card.review_order.pay_with_crypto': 'Pay with crypto',
      'card.review_order.pay_with_card': 'Pay with card',
    };
    return map[key] || key;
  },
}));

jest.mock('react-native-safe-area-context', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(View, props, children),
    SafeAreaProvider: View,
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn(() => ({})),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const React = jest.requireActual('react');
  const { View, Text: RNText } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(View, props, children),
    Text: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(RNText, props, children),
    TextVariant: {
      HeadingLg: 'HeadingLg',
      BodyMd: 'BodyMd',
    },
    FontWeight: {
      Regular: 'Regular',
      Medium: 'Medium',
      Bold: 'Bold',
    },
  };
});

describe('ReviewOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Render', () => {
    it('renders all required UI elements', () => {
      const { getByTestId } = render(<ReviewOrder />);

      expect(getByTestId(ReviewOrderSelectors.CONTAINER)).toBeTruthy();
      expect(getByTestId(ReviewOrderSelectors.TITLE)).toBeTruthy();
      expect(getByTestId(ReviewOrderSelectors.SUBTITLE)).toBeTruthy();
      expect(
        getByTestId(ReviewOrderSelectors.SHIPPING_ADDRESS_CARD),
      ).toBeTruthy();
      expect(getByTestId(ReviewOrderSelectors.ORDER_SUMMARY)).toBeTruthy();
      expect(
        getByTestId(ReviewOrderSelectors.PAY_WITH_CRYPTO_BUTTON),
      ).toBeTruthy();
      expect(
        getByTestId(ReviewOrderSelectors.PAY_WITH_CARD_BUTTON),
      ).toBeTruthy();
    });

    it('displays correct title and subtitle', () => {
      const { getByTestId } = render(<ReviewOrder />);

      expect(getByTestId(ReviewOrderSelectors.TITLE)).toHaveTextContent(
        strings('card.review_order.title'),
      );
      expect(getByTestId(ReviewOrderSelectors.SUBTITLE)).toHaveTextContent(
        strings('card.review_order.subtitle'),
      );
    });

    it('displays shipping address card with all elements', () => {
      const { getByTestId, getByText } = render(<ReviewOrder />);

      expect(
        getByTestId(ReviewOrderSelectors.SHIPPING_ADDRESS_CARD),
      ).toBeTruthy();
      expect(getByTestId(ReviewOrderSelectors.ADDRESS_LINE_1)).toBeTruthy();
      expect(
        getByTestId(ReviewOrderSelectors.ADDRESS_CITY_STATE_ZIP),
      ).toBeTruthy();
      expect(
        getByText(strings('card.review_order.shipping_address')),
      ).toBeTruthy();
    });

    it('displays metal card order items', () => {
      const { getByText } = render(<ReviewOrder />);

      expect(
        getByText(strings('card.review_order.metal_card_quantity')),
      ).toBeTruthy();
      expect(getByText(strings('card.review_order.fees'))).toBeTruthy();
      expect(getByText(strings('card.review_order.renews'))).toBeTruthy();
      expect(getByText(strings('card.review_order.total'))).toBeTruthy();
    });

    it('displays correct order item values', () => {
      const { getByText } = render(<ReviewOrder />);

      expect(
        getByText(strings('card.review_order.metal_card_price')),
      ).toBeTruthy();
      expect(getByText(strings('card.review_order.fees_free'))).toBeTruthy();
      expect(
        getByText(strings('card.review_order.renews_annually')),
      ).toBeTruthy();
      expect(
        getByText(strings('card.review_order.metal_card_total')),
      ).toBeTruthy();
    });
  });

  describe('Analytics', () => {
    it('tracks view event on mount', () => {
      render(<ReviewOrder />);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        screen: CardScreens.REVIEW_ORDER,
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('tracks pay with crypto button click', () => {
      const { getByTestId } = render(<ReviewOrder />);

      fireEvent.press(getByTestId(ReviewOrderSelectors.PAY_WITH_CRYPTO_BUTTON));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        action: CardActions.REVIEW_ORDER_PAY_CRYPTO,
      });
    });

    it('tracks pay with card button click', () => {
      const { getByTestId } = render(<ReviewOrder />);

      fireEvent.press(getByTestId(ReviewOrderSelectors.PAY_WITH_CARD_BUTTON));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        action: CardActions.REVIEW_ORDER_PAY_CARD,
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to order completed with crypto payment method', () => {
      const { getByTestId } = render(<ReviewOrder />);

      fireEvent.press(getByTestId(ReviewOrderSelectors.PAY_WITH_CRYPTO_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ORDER_COMPLETED, {
        paymentMethod: 'crypto',
      });
    });

    it('navigates to order completed with card payment method', () => {
      const { getByTestId } = render(<ReviewOrder />);

      fireEvent.press(getByTestId(ReviewOrderSelectors.PAY_WITH_CARD_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.ORDER_COMPLETED, {
        paymentMethod: 'card',
      });
    });
  });
});
