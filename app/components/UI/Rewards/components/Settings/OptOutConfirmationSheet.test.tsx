import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OptOutConfirmationSheet from './OptOutConfirmationSheet';

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'rewards.optout.modal.confirmation_title': 'Are you sure?',
      'rewards.optout.modal.confirmation_description':
        "This will erase all your progress, and can't be reversed. If you rejoin the Rewards program later, you'll start back at 0.",
      'rewards.optout.modal.type_to_confirm':
        "Type 'erase progress' to continue",
      'rewards.optout.modal.confirm_phrase': 'erase progress',
      'rewards.optout.modal.cancel': 'Cancel',
      'rewards.optout.modal.confirm': 'Confirm',
      'rewards.optout.modal.error_message':
        'Failed to opt out of Rewards. Please try again.',
    };
    return map[key] || key;
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const {
    Text: RNText,
    View,
    TouchableOpacity,
  } = jest.requireActual('react-native');

  return {
    Box: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => ReactActual.createElement(View, { testID, ...props }, children),
    Text: ({
      children,
      testID,
      ...props
    }: {
      children?: React.ReactNode;
      testID?: string;
      [key: string]: unknown;
    }) => ReactActual.createElement(RNText, { testID, ...props }, children),
    Button: ({
      children,
      onPress,
      testID,
      isDisabled,
      isLoading,
      isDanger,
      ...props
    }: {
      children?: React.ReactNode;
      onPress?: () => void;
      testID?: string;
      isDisabled?: boolean;
      isLoading?: boolean;
      isDanger?: boolean;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(
        TouchableOpacity,
        {
          onPress: isDisabled || isLoading ? undefined : onPress,
          testID,
          disabled: isDisabled || isLoading,
          ...props,
        },
        ReactActual.createElement(RNText, {}, children),
      ),
    ButtonIcon: ({
      onPress,
      testID,
      ...props
    }: {
      onPress?: () => void;
      testID?: string;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(TouchableOpacity, {
        onPress,
        testID,
        ...props,
      }),
    TextVariant: { HeadingSm: 'HeadingSm', BodyMd: 'BodyMd', BodySm: 'BodySm' },
    FontWeight: { Bold: 'Bold' },
    ButtonVariant: { Primary: 'Primary', Secondary: 'Secondary' },
    ButtonSize: { Lg: 'Lg' },
    BoxFlexDirection: { Row: 'row' },
    BoxAlignItems: { Center: 'center' },
    BoxJustifyContent: { Center: 'center' },
    IconName: { Close: 'Close' },
    IconColor: { IconDefault: 'IconDefault' },
  };
});

jest.mock('react-native-keyboard-aware-scroll-view', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    KeyboardAwareScrollView: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(View, {}, children),
  };
});

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        children,
      }: {
        children: React.ReactNode;
        onClose?: () => void;
        shouldNavigateBack?: boolean;
      }) =>
        ReactActual.createElement(View, { testID: 'bottom-sheet' }, children),
    };
  },
);

jest.mock('../../../../../component-library/components/Form/TextField', () => {
  const ReactActual = jest.requireActual('react');
  const { TextInput } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      value,
      onChangeText,
      testID,
      placeholder,
      ...props
    }: {
      value?: string;
      onChangeText?: (text: string) => void;
      testID?: string;
      placeholder?: string;
      [key: string]: unknown;
    }) =>
      ReactActual.createElement(TextInput, {
        value,
        onChangeText,
        testID,
        placeholder,
        ...props,
      }),
  };
});

jest.mock('../RewardsErrorBanner', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ testID, title }: { testID?: string; title?: string }) =>
      ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(RNText, {}, title),
      ),
  };
});

describe('OptOutConfirmationSheet', () => {
  const defaultProps = {
    isLoading: false,
    errorMessage: undefined,
    onConfirm: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, description, and input label', () => {
    const { getByTestId, getByText } = render(
      <OptOutConfirmationSheet {...defaultProps} />,
    );
    expect(getByTestId('opt-out-confirmation-title')).toBeTruthy();
    expect(getByText('Are you sure?')).toBeTruthy();
    expect(getByTestId('opt-out-confirmation-description')).toBeTruthy();
    expect(getByTestId('opt-out-confirmation-input-label')).toBeTruthy();
    expect(getByText("Type 'erase progress' to continue")).toBeTruthy();
  });

  it('renders the text input', () => {
    const { getByTestId } = render(
      <OptOutConfirmationSheet {...defaultProps} />,
    );
    expect(getByTestId('opt-out-confirmation-input')).toBeTruthy();
  });

  it('does not call onConfirm when phrase does not match', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <OptOutConfirmationSheet {...defaultProps} onConfirm={onConfirm} />,
    );
    const input = getByTestId('opt-out-confirmation-input');
    fireEvent.changeText(input, 'wrong phrase');
    fireEvent.press(getByTestId('opt-out-confirmation-confirm'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('confirm button calls onConfirm when input matches phrase exactly', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <OptOutConfirmationSheet {...defaultProps} onConfirm={onConfirm} />,
    );
    const input = getByTestId('opt-out-confirmation-input');
    fireEvent.changeText(input, 'erase progress');
    fireEvent.press(getByTestId('opt-out-confirmation-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('confirm button matches phrase case-insensitively', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <OptOutConfirmationSheet {...defaultProps} onConfirm={onConfirm} />,
    );
    const input = getByTestId('opt-out-confirmation-input');
    fireEvent.changeText(input, 'ERASE PROGRESS');
    fireEvent.press(getByTestId('opt-out-confirmation-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('confirm button matches phrase with leading/trailing spaces', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <OptOutConfirmationSheet {...defaultProps} onConfirm={onConfirm} />,
    );
    const input = getByTestId('opt-out-confirmation-input');
    fireEvent.changeText(input, '  erase progress  ');
    fireEvent.press(getByTestId('opt-out-confirmation-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('does not call onConfirm when input is empty', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <OptOutConfirmationSheet {...defaultProps} onConfirm={onConfirm} />,
    );
    fireEvent.press(getByTestId('opt-out-confirmation-confirm'));
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onClose when cancel is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <OptOutConfirmationSheet {...defaultProps} onClose={onClose} />,
    );
    fireEvent.press(getByTestId('opt-out-confirmation-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when close icon is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = render(
      <OptOutConfirmationSheet {...defaultProps} onClose={onClose} />,
    );
    fireEvent.press(getByTestId('opt-out-confirmation-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows error banner when errorMessage is provided', () => {
    const { getByTestId, getByText } = render(
      <OptOutConfirmationSheet
        {...defaultProps}
        errorMessage="Failed to opt out of Rewards. Please try again."
      />,
    );
    expect(getByTestId('opt-out-error-banner')).toBeTruthy();
  });

  it('does not show error banner when errorMessage is undefined', () => {
    const { queryByTestId } = render(
      <OptOutConfirmationSheet {...defaultProps} errorMessage={undefined} />,
    );
    expect(queryByTestId('opt-out-error-banner')).toBeNull();
  });

  it('does not call onConfirm when isLoading is true even with correct phrase', () => {
    const onConfirm = jest.fn();
    const { getByTestId } = render(
      <OptOutConfirmationSheet
        {...defaultProps}
        isLoading
        onConfirm={onConfirm}
      />,
    );
    const input = getByTestId('opt-out-confirmation-input');
    fireEvent.changeText(input, 'erase progress');
    fireEvent.press(getByTestId('opt-out-confirmation-confirm'));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
