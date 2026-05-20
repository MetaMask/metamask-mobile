import React from 'react';
import { fireEvent } from '@testing-library/react-native';

import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import { evmSendStateMock } from '../../../__mocks__/send.mock';
import { useSendContext } from '../../../context/send-context';
import { useUnreliableNetworkAlert } from '../../../hooks/send/alerts/useUnreliableNetworkAlert';
import { AmountAlerts } from './amount-alerts';

jest.mock('../../../context/send-context', () => ({
  useSendContext: jest.fn(),
}));

jest.mock('../../../hooks/send/alerts/useUnreliableNetworkAlert', () => ({
  useUnreliableNetworkAlert: jest.fn(),
}));

jest.mock('../../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const map: Record<string, string> = {
      'send.cancel': 'Cancel',
      'send.update': 'Update',
      'send.alert_navigation_previous': 'Previous alert',
      'send.alert_navigation_next': 'Next alert',
    };
    return map[key] || key;
  },
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

const ALERT = {
  key: 'unreliableNetwork',
  title: 'Unavailable network connection',
  message: 'The connection with Ethereum is unreliable.',
  acknowledgeButtonLabel: 'Update',
};

const mockUseSendContext = jest.mocked(useSendContext);
const mockUseUnreliableNetworkAlert = jest.mocked(useUnreliableNetworkAlert);
const mockNavigateToEditNetwork = jest.fn();

const setupHook = (alert: typeof ALERT | null) => {
  mockUseUnreliableNetworkAlert.mockReturnValue({
    alert,
    navigateToEditNetwork: mockNavigateToEditNetwork,
  });
};

const setupContext = (chainId: string | undefined) => {
  mockUseSendContext.mockReturnValue({
    chainId,
  } as unknown as ReturnType<typeof useSendContext>);
};

const renderComponent = () =>
  renderWithProvider(<AmountAlerts />, { state: evmSendStateMock });

describe('AmountAlerts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupContext('0x1');
  });

  it('does not render the modal when there is no alert', () => {
    setupHook(null);

    const { queryByText } = renderComponent();

    expect(queryByText(ALERT.title)).toBeNull();
  });

  it('auto-opens the modal when an unreliable network alert is present', () => {
    setupHook(ALERT);

    const { getByText } = renderComponent();

    expect(getByText(ALERT.title)).toBeTruthy();
    expect(getByText('Update')).toBeTruthy();
  });

  it('closes the modal when Cancel is pressed', () => {
    setupHook(ALERT);

    const { getByTestId, queryByText } = renderComponent();

    fireEvent.press(getByTestId('send-alert-modal-cancel-button'));

    expect(queryByText(ALERT.title)).toBeNull();
  });

  it('calls navigateToEditNetwork when Update is pressed', () => {
    setupHook(ALERT);

    const { getByTestId } = renderComponent();

    fireEvent.press(getByTestId('send-alert-modal-acknowledge-button'));

    expect(mockNavigateToEditNetwork).toHaveBeenCalledTimes(1);
  });
});
