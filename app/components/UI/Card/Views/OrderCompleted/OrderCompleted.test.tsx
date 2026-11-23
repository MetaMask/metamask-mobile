import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { StackActions } from '@react-navigation/native';
import OrderCompleted from './OrderCompleted';
import { OrderCompletedSelectors } from './OrderCompleted.testIds';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { CardActions, CardScreens } from '../../util/metrics';

const mockNavigate = jest.fn();
const mockDispatch = jest.fn();
const mockGoBack = jest.fn();
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
      goBack: mockGoBack,
    }),
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

describe('OrderCompleted', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFromUpgrade = false;
  });

  describe('Render', () => {
    it('renders the ordered-card content and actions', () => {
      const { getByTestId } = render(<OrderCompleted />);

      expect(getByTestId(OrderCompletedSelectors.CONTAINER)).toBeOnTheScreen();
      expect(getByTestId(OrderCompletedSelectors.CARD_IMAGE)).toBeOnTheScreen();
      expect(getByTestId(OrderCompletedSelectors.TITLE)).toHaveTextContent(
        strings('card.order_completed.title'),
      );
      expect(getByTestId(OrderCompletedSelectors.SUBTITLE)).toHaveTextContent(
        strings('card.order_completed.subtitle'),
      );
      expect(
        getByTestId(OrderCompletedSelectors.DESCRIPTION),
      ).toHaveTextContent(strings('card.order_completed.description'));
      expect(
        getByTestId(OrderCompletedSelectors.SET_UP_CARD_BUTTON),
      ).toHaveTextContent(strings('card.order_completed.set_up_card_button'));
      expect(
        getByTestId(OrderCompletedSelectors.NOT_NOW_BUTTON),
      ).toHaveTextContent(strings('card.card_onboarding.not_now_button'));
    });
  });

  describe('Analytics', () => {
    it('tracks view event on mount', () => {
      render(<OrderCompleted />);

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_VIEWED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        provider: 'baanx',
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
        provider: 'baanx',
        action: CardActions.ORDER_COMPLETED_SET_UP_CARD,
        from_upgrade: false,
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to SpendingLimit via StackActions.replace during onboarding flow', () => {
      const { getByTestId } = render(<OrderCompleted />);

      fireEvent.press(getByTestId(OrderCompletedSelectors.SET_UP_CARD_BUTTON));

      expect(mockDispatch).toHaveBeenCalledWith(
        StackActions.replace(Routes.CARD.SPENDING_LIMIT, {
          flow: 'onboarding',
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('navigates to Card Home when fromUpgrade is true', () => {
      mockFromUpgrade = true;
      const { getByTestId } = render(<OrderCompleted />);

      fireEvent.press(getByTestId(OrderCompletedSelectors.SET_UP_CARD_BUTTON));

      expect(
        getByTestId(OrderCompletedSelectors.SET_UP_CARD_BUTTON),
      ).toHaveTextContent(strings('card.order_completed.back_to_card_button'));
      expect(mockNavigate).toHaveBeenCalledWith(Routes.CARD.HOME);
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('goes back when Not now is pressed', () => {
      const { getByTestId } = render(<OrderCompleted />);

      fireEvent.press(getByTestId(OrderCompletedSelectors.NOT_NOW_BUTTON));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockDispatch).not.toHaveBeenCalled();
    });
  });
});
