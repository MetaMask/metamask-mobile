import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import type { SendAlert } from '../../../hooks/send/alerts/types';
import { SendAlertModal } from './send-alert-modal';

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => {
    const mockStrings: Record<string, string> = {
      'send.cancel': 'Cancel',
      'send.i_understand': 'I understand',
      'send.alert_navigation_previous': 'Previous alert',
      'send.alert_navigation_next': 'Next alert',
    };
    return mockStrings[key] || key;
  }),
}));

jest.mock(
  '../../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const mockReact = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    const MockBottomSheet = mockReact.forwardRef(
      (
        { children, onClose }: { children: unknown; onClose?: () => void },
        _ref: unknown,
      ) =>
        mockReact.createElement(
          View,
          { testID: 'bottom-sheet', onTouchEnd: onClose },
          children,
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
    const mockReact = jest.requireActual('react');
    const { View, Pressable, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        buttonPropsArray,
      }: {
        buttonPropsArray: {
          label: string;
          onPress: () => void;
          testID?: string;
        }[];
      }) =>
        mockReact.createElement(
          View,
          { testID: 'bottom-sheet-footer' },
          buttonPropsArray.map(
            (btn: { label: string; onPress: () => void; testID?: string }) =>
              mockReact.createElement(
                Pressable,
                { key: btn.label, testID: btn.testID, onPress: btn.onPress },
                mockReact.createElement(Text, null, btn.label),
              ),
          ),
        ),
    };
  },
);

const singleAlert: SendAlert[] = [
  {
    key: 'tokenContract',
    title: 'Token Contract Address',
    message: 'Sending to a token contract may result in lost tokens.',
  },
];

const twoAlerts: SendAlert[] = [
  {
    key: 'tokenContract',
    title: 'Smart contract address',
    message: 'Token contract warning text.',
  },
  {
    key: 'firstTimeInteraction',
    title: 'New address',
    message: 'First time message',
    acknowledgeButtonLabel: 'Continue',
  },
];

describe('SendAlertModal', () => {
  const defaultProps = {
    isOpen: true,
    alerts: singleAlert,
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

  it('returns null when alerts is empty', () => {
    const { toJSON } = renderWithProvider(
      <SendAlertModal {...defaultProps} alerts={[]} />,
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

  it('calls onClose when cancel button is pressed', () => {
    const onClose = jest.fn();
    const { getByTestId } = renderWithProvider(
      <SendAlertModal {...defaultProps} onClose={onClose} />,
    );

    fireEvent.press(getByTestId('send-alert-modal-cancel-button'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onAcknowledge when acknowledge is pressed on last alert', () => {
    const onAcknowledge = jest.fn();
    const { getByTestId } = renderWithProvider(
      <SendAlertModal {...defaultProps} onAcknowledge={onAcknowledge} />,
    );

    fireEvent.press(getByTestId('send-alert-modal-acknowledge-button'));

    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });

  it('advances to second alert when multiple alerts and first acknowledge', () => {
    const onAcknowledge = jest.fn();
    const { getByText, getByTestId } = renderWithProvider(
      <SendAlertModal
        {...defaultProps}
        alerts={twoAlerts}
        onAcknowledge={onAcknowledge}
      />,
    );

    expect(getByText('Smart contract address')).toBeOnTheScreen();
    fireEvent.press(getByTestId('send-alert-modal-acknowledge-button'));
    expect(getByText('New address')).toBeOnTheScreen();
    expect(onAcknowledge).not.toHaveBeenCalled();

    fireEvent.press(getByTestId('send-alert-modal-acknowledge-button'));
    expect(onAcknowledge).toHaveBeenCalledTimes(1);
  });
});
