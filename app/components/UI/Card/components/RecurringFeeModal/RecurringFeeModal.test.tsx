import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import RecurringFeeModal from './RecurringFeeModal';
import { RecurringFeeModalSelectors } from '../../../../../../e2e/selectors/Card/RecurringFeeModal.selectors';
import { strings } from '../../../../../../locales/i18n';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { CardActions, CardScreens } from '../../util/metrics';

const mockTrackEvent = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
}));

const mockOnCloseBottomSheet = jest.fn();

jest.mock('../../../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
  MetaMetricsEvents: {
    CARD_BUTTON_CLICKED: 'Card Button Clicked',
  },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'card.recurring_fee_modal.title': 'Recurring fee',
      'card.recurring_fee_modal.description':
        'A recurring $199 fee will be transferred from your stablecoin balance each year. Make sure you have enough funds to keep your card active.',
      'card.recurring_fee_modal.got_it': 'Got it',
    };
    return map[key] || key;
  },
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const React = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: React.forwardRef(
        (
          { children, testID }: React.PropsWithChildren<{ testID?: string }>,
          ref: React.Ref<{
            onCloseBottomSheet: (callback?: () => void) => void;
          }>,
        ) => {
          React.useImperativeHandle(ref, () => ({
            onCloseBottomSheet: mockOnCloseBottomSheet,
          }));
          return React.createElement(View, { testID }, children);
        },
      ),
    };
  },
);

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => {
    // eslint-disable-next-line @typescript-eslint/no-shadow
    const React = jest.requireActual('react');
    const { View, TouchableOpacity } = jest.requireActual('react-native');

    return {
      __esModule: true,
      default: ({
        children,
        onClose,
        testID,
      }: React.PropsWithChildren<{ onClose?: () => void; testID?: string }>) =>
        React.createElement(
          View,
          null,
          children,
          onClose &&
            React.createElement(
              TouchableOpacity,
              { onPress: onClose, testID },
              'Close',
            ),
        ),
    };
  },
);

jest.mock('@metamask/design-system-react-native', () => {
  // eslint-disable-next-line @typescript-eslint/no-shadow
  const React = jest.requireActual('react');
  const {
    View,
    Text: RNText,
    TouchableOpacity,
  } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(View, props, children),
    Text: ({
      children,
      onPress,
      ...props
    }: React.PropsWithChildren<
      { onPress?: () => void } & Record<string, unknown>
    >) =>
      onPress
        ? React.createElement(TouchableOpacity, { onPress, ...props }, children)
        : React.createElement(RNText, props, children),
    TextVariant: {
      HeadingSm: 'HeadingSm',
      BodyMd: 'BodyMd',
    },
    FontWeight: {
      Regular: 'Regular',
      Medium: 'Medium',
    },
    Button: ({
      children,
      onPress,
      testID,
    }: React.PropsWithChildren<{ onPress: () => void; testID?: string }>) =>
      React.createElement(TouchableOpacity, { onPress, testID }, children),
    ButtonVariant: {
      Primary: 'Primary',
    },
    ButtonSize: {
      Lg: 'Lg',
    },
  };
});

describe('RecurringFeeModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Render', () => {
    it('renders all required UI elements', () => {
      const { getByTestId } = render(<RecurringFeeModal />);

      expect(getByTestId(RecurringFeeModalSelectors.CONTAINER)).toBeTruthy();
      expect(getByTestId(RecurringFeeModalSelectors.TITLE)).toBeTruthy();
      expect(getByTestId(RecurringFeeModalSelectors.DESCRIPTION)).toBeTruthy();
      expect(
        getByTestId(RecurringFeeModalSelectors.GOT_IT_BUTTON),
      ).toBeTruthy();
      expect(getByTestId(RecurringFeeModalSelectors.CLOSE_BUTTON)).toBeTruthy();
    });

    it('displays correct title text', () => {
      const { getByTestId } = render(<RecurringFeeModal />);

      expect(getByTestId(RecurringFeeModalSelectors.TITLE)).toHaveTextContent(
        strings('card.recurring_fee_modal.title'),
      );
    });
  });

  describe('Interactions', () => {
    it('closes modal when Got it button is pressed', () => {
      const { getByTestId } = render(<RecurringFeeModal />);

      fireEvent.press(getByTestId(RecurringFeeModalSelectors.GOT_IT_BUTTON));

      expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    });

    it('closes modal when close button is pressed', () => {
      const { getByTestId } = render(<RecurringFeeModal />);

      fireEvent.press(getByTestId(RecurringFeeModalSelectors.CLOSE_BUTTON));

      expect(mockOnCloseBottomSheet).toHaveBeenCalled();
    });
  });

  describe('Analytics', () => {
    it('tracks Got it button click', () => {
      const { getByTestId } = render(<RecurringFeeModal />);

      fireEvent.press(getByTestId(RecurringFeeModalSelectors.GOT_IT_BUTTON));

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.CARD_BUTTON_CLICKED,
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        action: CardActions.RECURRING_FEE_GOT_IT,
        screen: CardScreens.REVIEW_ORDER,
      });
    });
  });
});
