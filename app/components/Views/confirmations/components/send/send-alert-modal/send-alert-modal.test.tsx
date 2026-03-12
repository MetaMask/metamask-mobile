import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { SendAlertModal } from './send-alert-modal';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'send.cancel': 'Cancel',
      'send.i_understand': 'I understand',
    };
    return mockStrings[key] || key;
  }),
}));

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const { View } = jest.requireActual('react-native');
    const MockBottomSheet = React.forwardRef(
      (
        {
          children,
          onClose,
        }: { children: React.ReactNode; onClose?: () => void },
        _ref: React.Ref<unknown>,
      ) => (
        <View testID="bottom-sheet" onTouchEnd={onClose}>
          {children}
        </View>
      ),
    );
    MockBottomSheet.displayName = 'MockBottomSheet';
    return {
      __esModule: true,
      default: MockBottomSheet,
    };
  },
);

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheetFooter',
  () => {
    const { View, Pressable, Text } = jest.requireActual('react-native');
    const MockBottomSheetFooter = ({
      buttonPropsArray,
    }: {
      buttonPropsArray: {
        label: string;
        onPress: () => void;
        testID?: string;
      }[];
    }) => (
      <View testID="bottom-sheet-footer">
        {buttonPropsArray.map(
          (btn: { label: string; onPress: () => void; testID?: string }) => (
            <Pressable
              key={btn.label}
              testID={btn.testID}
              onPress={btn.onPress}
            >
              <Text>{btn.label}</Text>
            </Pressable>
          ),
        )}
      </View>
    );
    return {
      __esModule: true,
      default: MockBottomSheetFooter,
    };
  },
);

describe('SendAlertModal', () => {
  const defaultProps = {
    isOpen: true,
    title: 'Token Contract Address',
    errorMessage: 'Sending to a token contract may result in lost tokens.',
    onAcknowledge: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when isOpen is false', () => {
    const { toJSON } = renderWithProvider(
      <SendAlertModal {...defaultProps} isOpen={false} />,
    );

    expect(toJSON()).toBeNull();
  });

  it('renders modal content when isOpen is true', () => {
    const { getByText } = renderWithProvider(
      <SendAlertModal {...defaultProps} />,
    );

    expect(getByText('Token Contract Address')).toBeOnTheScreen();
    expect(
      getByText('Sending to a token contract may result in lost tokens.'),
    ).toBeOnTheScreen();
  });

  it('displays the title text', () => {
    const { getByText } = renderWithProvider(
      <SendAlertModal {...defaultProps} title="Custom Title" />,
    );

    expect(getByText('Custom Title')).toBeOnTheScreen();
  });

  it('displays the error message text', () => {
    const { getByText } = renderWithProvider(
      <SendAlertModal {...defaultProps} errorMessage="Custom error message" />,
    );

    expect(getByText('Custom error message')).toBeOnTheScreen();
  });

  it('calls onClose when cancel button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderWithProvider(
      <SendAlertModal {...defaultProps} onClose={onClose} />,
    );

    fireEvent.press(getByTestId('send-alert-modal-cancel-button'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onAcknowledge when acknowledge button is pressed', () => {
    const onAcknowledge = jest.fn();
    const { getByTestId } = renderWithProvider(
      <SendAlertModal {...defaultProps} onAcknowledge={onAcknowledge} />,
    );

    fireEvent.press(getByTestId('send-alert-modal-acknowledge-button'));

    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });

  it('does not call onAcknowledge when cancel is pressed', () => {
    const onAcknowledge = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = renderWithProvider(
      <SendAlertModal
        {...defaultProps}
        onAcknowledge={onAcknowledge}
        onClose={onClose}
      />,
    );

    fireEvent.press(getByTestId('send-alert-modal-cancel-button'));

    expect(onAcknowledge).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when acknowledge is pressed', () => {
    const onAcknowledge = jest.fn();
    const onClose = jest.fn();
    const { getByTestId } = renderWithProvider(
      <SendAlertModal
        {...defaultProps}
        onAcknowledge={onAcknowledge}
        onClose={onClose}
      />,
    );

    fireEvent.press(getByTestId('send-alert-modal-acknowledge-button'));

    expect(onClose).not.toHaveBeenCalled();
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });
});
