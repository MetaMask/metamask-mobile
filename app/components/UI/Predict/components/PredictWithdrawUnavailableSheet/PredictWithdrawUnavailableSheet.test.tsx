import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import PredictWithdrawUnavailableSheet from './PredictWithdrawUnavailableSheet';
import { PREDICT_BALANCE_TEST_IDS } from '../PredictBalance/PredictBalance.testIds';

let mockIsVisible = true;
const mockCloseSheet = jest.fn();
const mockGetRefHandlers = jest.fn(() => ({
  onOpenBottomSheet: jest.fn(),
  onCloseBottomSheet: jest.fn(),
}));

jest.mock('../../hooks/usePredictBottomSheet', () => ({
  usePredictBottomSheet: () => ({
    sheetRef: { current: null },
    isVisible: mockIsVisible,
    closeSheet: mockCloseSheet,
    handleSheetClosed: jest.fn(),
    getRefHandlers: mockGetRefHandlers,
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const {
    Text: RNText,
    TouchableOpacity,
    View,
  } = jest.requireActual('react-native');

  interface MockBottomSheetProps {
    children?: React.ReactNode;
    testID?: string;
  }

  interface MockBottomSheetHeaderProps {
    children?: React.ReactNode;
    closeButtonProps?: { testID?: string };
    onClose?: () => void;
    titleTestID?: string;
  }

  interface MockButtonProps {
    children?: React.ReactNode;
    onPress?: () => void;
    testID?: string;
  }

  return {
    BottomSheet: ReactActual.forwardRef(
      (props: MockBottomSheetProps, _ref: React.Ref<unknown>) =>
        ReactActual.createElement(
          View,
          { testID: props.testID },
          props.children,
        ),
    ),
    BottomSheetHeader: ({
      children,
      closeButtonProps,
      onClose,
      titleTestID,
    }: MockBottomSheetHeaderProps) =>
      ReactActual.createElement(
        View,
        null,
        ReactActual.createElement(RNText, { testID: titleTestID }, children),
        onClose
          ? ReactActual.createElement(
              TouchableOpacity,
              { testID: closeButtonProps?.testID, onPress: onClose },
              ReactActual.createElement(RNText, null, 'Close'),
            )
          : null,
      ),
    BottomSheetFooter: ({
      primaryButtonProps,
    }: {
      primaryButtonProps?: MockButtonProps;
    }) =>
      primaryButtonProps
        ? ReactActual.createElement(
            TouchableOpacity,
            {
              testID: primaryButtonProps.testID,
              onPress: primaryButtonProps.onPress,
            },
            ReactActual.createElement(
              RNText,
              null,
              primaryButtonProps.children,
            ),
          )
        : null,
    Box: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { testID }, children),
    BoxAlignItems: {
      Start: 'Start',
    },
    Text: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(RNText, { testID }, children),
    TextColor: {
      TextAlternative: 'TextAlternative',
    },
    TextVariant: {
      BodyMd: 'BodyMd',
    },
  };
});

describe('PredictWithdrawUnavailableSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsVisible = true;
  });

  it('renders null when closed', () => {
    mockIsVisible = false;

    const { queryByTestId } = render(<PredictWithdrawUnavailableSheet />);

    expect(
      queryByTestId(PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_SHEET),
    ).toBeNull();
  });

  it('renders the temporary Deposit Wallet withdraw unavailable note', () => {
    const { getByTestId } = render(<PredictWithdrawUnavailableSheet />);

    expect(
      getByTestId(PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_SHEET),
    ).toBeOnTheScreen();
    expect(
      getByTestId(PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_TITLE),
    ).toHaveTextContent(strings('predict.withdraw.unavailable_title'));
    expect(
      getByTestId(PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_DESCRIPTION),
    ).toHaveTextContent(strings('predict.withdraw.unavailable_description'));
    expect(
      getByTestId(PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_GOT_IT_BUTTON),
    ).toHaveTextContent(strings('predict.withdraw.unavailable_got_it'));
  });

  it('dismisses when Got it is pressed', () => {
    const { getByTestId } = render(<PredictWithdrawUnavailableSheet />);

    fireEvent.press(
      getByTestId(PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_GOT_IT_BUTTON),
    );

    expect(mockCloseSheet).toHaveBeenCalledTimes(1);
  });

  it('dismisses when close is pressed', () => {
    const { getByTestId } = render(<PredictWithdrawUnavailableSheet />);

    fireEvent.press(
      getByTestId(PREDICT_BALANCE_TEST_IDS.WITHDRAW_UNAVAILABLE_CLOSE_BUTTON),
    );

    expect(mockCloseSheet).toHaveBeenCalledTimes(1);
  });
});
