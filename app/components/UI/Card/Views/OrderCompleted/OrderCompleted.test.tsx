import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OrderCompleted from './OrderCompleted';
import { OrderCompletedSelectors } from './OrderCompleted.testIds';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens } from '../../util/metrics';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
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
      dispatch: mockDispatch,
    }),
    StackActions: {
      replace: jest.fn((routeName, params) => ({
        type: 'REPLACE',
        payload: { name: routeName, params },
      })),
    },
  };
});

let mockFromUpgrade = false;

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({
    fromUpgrade: mockFromUpgrade,
  }),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'card.order_completed.title': 'YOUR CARD\nIS ORDERED',
      'card.order_completed.subtitle': 'It should arrive in 4 to 6 weeks.',
      'card.order_completed.description':
        'Set up your virtual card and add it to your digital wallet to start earning cashback.',
      'card.order_completed.set_up_card_button': 'Set up card',
      'card.order_completed.back_to_card_button': 'Back to card',
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
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: jest.fn((...args) =>
      args.reduce(
        (acc, arg) => ({ ...acc, ...(typeof arg === 'object' ? arg : {}) }),
        {},
      ),
    ),
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
    },
  };
});

describe('OrderCompleted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFromUpgrade = false;
  });

  describe('Render', () => {
    it('renders all required UI elements', () => {
      const { getByTestId } = render(<OrderCompleted />);

      expect(getByTestId(OrderCompletedSelectors.CONTAINER)).toBeTruthy();
      expect(getByTestId(OrderCompletedSelectors.CARD_IMAGE)).toBeTruthy();
      expect(getByTestId(OrderCompletedSelectors.TITLE)).toBeTruthy();
      expect(getByTestId(OrderCompletedSelectors.SUBTITLE)).toBeTruthy();
      expect(getByTestId(OrderCompletedSelectors.DESCRIPTION)).toBeTruthy();
      expect(
        getByTestId(OrderCompletedSelectors.SET_UP_CARD_BUTTON),
      ).toBeTruthy();
    });

    it('displays correct text content', () => {
      const { getByTestId } = render(<OrderCompleted />);

      expect(getByTestId(OrderCompletedSelectors.TITLE)).toHaveTextContent(
        strings('card.order_completed.title'),
      );
      expect(getByTestId(OrderCompletedSelectors.SUBTITLE)).toHaveTextContent(
        strings('card.order_completed.subtitle'),
      );
      expect(
        getByTestId(OrderCompletedSelectors.DESCRIPTION),
      ).toHaveTextContent(strings('card.order_completed.description'));
    });
  });

  describe('Analytics', () => {
    it('tracks view event on mount', () => {
      render(<OrderCompleted />);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        screen: CardScreens.ORDER_COMPLETED,
        from_upgrade: false,
      });
      expect(mockTrackEvent).toHaveBeenCalled();
    });

    it('tracks set up card button click', () => {
      const { getByTestId } = render(<OrderCompleted />);

      fireEvent.press(getByTestId(OrderCompletedSelectors.SET_UP_CARD_BUTTON));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        action: CardActions.ORDER_COMPLETED_SET_UP_CARD,
        from_upgrade: false,
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to SpendingLimit via StackActions.replace during onboarding flow', () => {
      mockFromUpgrade = false;
      const { StackActions } = jest.requireMock('@react-navigation/native');
      const { getByTestId } = render(<OrderCompleted />);

      fireEvent.press(getByTestId(OrderCompletedSelectors.SET_UP_CARD_BUTTON));

      expect(StackActions.replace).toHaveBeenCalledWith(
        Routes.CARD.SPENDING_LIMIT,
        { flow: 'onboarding' },
      );
      expect(mockDispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'REPLACE' }),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('navigates to Card Home when fromUpgrade is true', () => {
      mockFromUpgrade = true;
      const { getByTestId } = render(<OrderCompleted />);

      fireEvent.press(getByTestId(OrderCompletedSelectors.SET_UP_CARD_BUTTON));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.HOME);
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });
});
