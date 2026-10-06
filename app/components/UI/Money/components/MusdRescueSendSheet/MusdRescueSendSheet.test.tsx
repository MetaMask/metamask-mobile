import React from 'react';
import { TextInput } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import BigNumber from 'bignumber.js';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MusdRescueSendSheet from './MusdRescueSendSheet';
import { MusdRescueSendSheetTestIds } from '../MoneyTransferSheet/MoneyTransferSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import { doENSLookup } from '../../../../../util/ENSUtils';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import useMoneyAccountMusdRescueSend from '../../hooks/useMoneyAccountMusdRescueSend';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccountMusdRescueSend', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAnalytics', () => ({
  useMoneyAnalytics: jest.fn(),
}));

jest.mock('../../../../../util/ENSUtils', () => ({
  doENSLookup: jest.fn(),
}));

const mockTrackBottomSheetViewed = jest.fn();
const mockTrackSurfaceClicked = jest.fn();
const mockInitiateRescueSend = jest.fn().mockResolvedValue(undefined);
const mockGoBack = jest.fn();
const mockOnCloseBottomSheet = jest.fn((cb?: () => void) => cb?.());

const mockUseMoneyAccountBalance = useMoneyAccountBalance as jest.Mock;
const mockUseMoneyAccountMusdRescueSend =
  useMoneyAccountMusdRescueSend as jest.Mock;

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual('@metamask/design-system-react-native');
  const ReactActual = jest.requireActual('react');
  const { View, Text: RNText, Pressable } = jest.requireActual('react-native');

  const MockBottomSheet = ReactActual.forwardRef(
    (
      {
        children,
        testID,
        goBack,
      }: {
        children: React.ReactNode;
        testID?: string;
        goBack?: () => void;
      },
      ref: React.Ref<{ onCloseBottomSheet: (cb?: () => void) => void }>,
    ) => {
      ReactActual.useImperativeHandle(ref, () => ({
        onCloseBottomSheet: mockOnCloseBottomSheet,
        onOpenBottomSheet: jest.fn(),
      }));
      return ReactActual.createElement(
        View,
        { testID },
        ReactActual.createElement(
          Pressable,
          {
            testID: 'bottom-sheet-go-back',
            onPress: goBack,
          },
          ReactActual.createElement(RNText, {}, 'go-back'),
        ),
        children,
      );
    },
  );

  const MockBottomSheetHeader = ({
    children,
    onClose,
  }: {
    children: React.ReactNode;
    onClose?: () => void;
  }) =>
    ReactActual.createElement(
      View,
      { testID: 'bottom-sheet-header' },
      ReactActual.createElement(
        Pressable,
        { testID: 'bottom-sheet-close-button', onPress: onClose },
        ReactActual.createElement(RNText, {}, 'close'),
      ),
      children,
    );

  return {
    ...actual,
    BottomSheet: MockBottomSheet,
    BottomSheetHeader: MockBottomSheetHeader,
  };
});

const VALID_ADDRESS = '0x1234567890123456789012345678901234567891';

// 99 liquid mUSD.
const setupBalance = ({
  liquidMusd = '99' as string | undefined,
  isLoading = false,
  isError = false,
} = {}) => {
  mockUseMoneyAccountBalance.mockReturnValue({
    liquidMusd:
      liquidMusd === undefined ? undefined : new BigNumber(liquidMusd),
    isBalanceLoading: isLoading,
    isBalanceFetchError: isError,
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(doENSLookup).mockResolvedValue(undefined);
  mockInitiateRescueSend.mockImplementation(async (options) => {
    options.onBeforeConfirmation?.();
  });
  mockUseMoneyAccountMusdRescueSend.mockReturnValue({
    initiateRescueSend: mockInitiateRescueSend,
  });
  (useMoneyAnalytics as jest.Mock).mockReturnValue({
    trackBottomSheetViewed: mockTrackBottomSheetViewed,
    trackSurfaceClicked: mockTrackSurfaceClicked,
  });
  setupBalance();
});

describe('MusdRescueSendSheet', () => {
  it('renders title, explainer, and liquid balance', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <MusdRescueSendSheet />,
    );

    expect(
      getByText(strings('money.musd_rescue_send.title')),
    ).toBeOnTheScreen();
    expect(
      getByText(strings('money.musd_rescue_send.explainer')),
    ).toBeOnTheScreen();
    expect(
      getByTestId(MusdRescueSendSheetTestIds.LIQUID_BALANCE).props.children,
    ).toContain('99');
  });

  it('tracks the bottom sheet view on mount', () => {
    renderWithProvider(<MusdRescueSendSheet />);

    expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
  });

  it('shows the balance-unavailable message while loading', () => {
    setupBalance({ liquidMusd: undefined, isLoading: true });

    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    expect(
      getByTestId(MusdRescueSendSheetTestIds.LIQUID_BALANCE).props.children,
    ).toContain(strings('money.musd_rescue_send.error_balance_unavailable'));
  });

  it('blocks the send while the balance is unavailable', async () => {
    setupBalance({ liquidMusd: undefined, isError: true });

    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    const sendButton = getByTestId(MusdRescueSendSheetTestIds.SEND_BUTTON);
    // Design-system Button exposes disabled via accessibilityState.
    expect(sendButton.props.accessibilityState?.disabled).toBe(true);
    expect(mockInitiateRescueSend).not.toHaveBeenCalled();
  });

  it('fills the exact liquid balance on Max', () => {
    setupBalance({ liquidMusd: '99.123456' });

    const { getByTestId, getByDisplayValue } = renderWithProvider(
      <MusdRescueSendSheet />,
    );

    fireEvent.press(getByTestId(MusdRescueSendSheetTestIds.MAX_BUTTON));

    // value lives on the inner TextInput of the TextField.
    expect(getByDisplayValue('99.123456')).toBeOnTheScreen();
  });

  it('rejects an invalid recipient with an error message', async () => {
    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    fireEvent.changeText(
      getByTestId(MusdRescueSendSheetTestIds.RECIPIENT_INPUT),
      'not-an-address',
    );
    fireEvent.changeText(
      getByTestId(MusdRescueSendSheetTestIds.AMOUNT_INPUT),
      '1',
    );
    fireEvent.press(getByTestId(MusdRescueSendSheetTestIds.SEND_BUTTON));

    expect(
      getByTestId(MusdRescueSendSheetTestIds.ERROR_MESSAGE).props.children,
    ).toBe(strings('money.musd_rescue_send.error_invalid_recipient'));
    expect(mockInitiateRescueSend).not.toHaveBeenCalled();
  });

  it('rejects a zero amount with an error message', async () => {
    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    fireEvent.changeText(
      getByTestId(MusdRescueSendSheetTestIds.RECIPIENT_INPUT),
      VALID_ADDRESS,
    );
    fireEvent.changeText(
      getByTestId(MusdRescueSendSheetTestIds.AMOUNT_INPUT),
      '0',
    );
    fireEvent.press(getByTestId(MusdRescueSendSheetTestIds.SEND_BUTTON));

    expect(
      getByTestId(MusdRescueSendSheetTestIds.ERROR_MESSAGE).props.children,
    ).toBe(strings('money.musd_rescue_send.error_invalid_amount'));
    expect(mockInitiateRescueSend).not.toHaveBeenCalled();
  });

  it('rejects an amount above the liquid balance', async () => {
    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    fireEvent.changeText(
      getByTestId(MusdRescueSendSheetTestIds.RECIPIENT_INPUT),
      VALID_ADDRESS,
    );
    fireEvent.changeText(
      getByTestId(MusdRescueSendSheetTestIds.AMOUNT_INPUT),
      '99.000001',
    );
    fireEvent.press(getByTestId(MusdRescueSendSheetTestIds.SEND_BUTTON));

    expect(
      getByTestId(MusdRescueSendSheetTestIds.ERROR_MESSAGE).props.children,
    ).toBe(strings('money.musd_rescue_send.error_insufficient_balance'));
    expect(mockInitiateRescueSend).not.toHaveBeenCalled();
  });

  it('resolves an ENS recipient through Ethereum mainnet before initiating the send', async () => {
    const ensAddress = '0x2345678901234567890123456789012345678912';
    jest.mocked(doENSLookup).mockResolvedValue(ensAddress);
    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    fireEvent.changeText(
      getByTestId(MusdRescueSendSheetTestIds.RECIPIENT_INPUT),
      'support.eth',
    );
    fireEvent.changeText(
      getByTestId(MusdRescueSendSheetTestIds.AMOUNT_INPUT),
      '1.5',
    );
    fireEvent.press(getByTestId(MusdRescueSendSheetTestIds.SEND_BUTTON));

    await waitFor(() => {
      expect(doENSLookup).toHaveBeenCalledWith('support.eth', '0x1');
      expect(mockInitiateRescueSend.mock.calls[0][0].recipient).toBe(
        ensAddress,
      );
    });
  });

  it('initiates the send with the resolved recipient and amount', async () => {
    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    fireEvent.changeText(
      getByTestId(MusdRescueSendSheetTestIds.RECIPIENT_INPUT),
      VALID_ADDRESS,
    );
    fireEvent.changeText(
      getByTestId(MusdRescueSendSheetTestIds.AMOUNT_INPUT),
      '1.5',
    );
    fireEvent.press(getByTestId(MusdRescueSendSheetTestIds.SEND_BUTTON));

    const initiateArgs = mockInitiateRescueSend.mock.calls[0][0];
    expect(initiateArgs).toEqual(
      expect.objectContaining({
        recipient: VALID_ADDRESS,
        amount: '1.5',
      }),
    );
    expect(initiateArgs.onBeforeConfirmation).toBeUndefined();
  });

  it('closes the sheet after a successful initiation', async () => {
    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    fireEvent.changeText(
      getByTestId(MusdRescueSendSheetTestIds.RECIPIENT_INPUT),
      VALID_ADDRESS,
    );
    fireEvent.changeText(
      getByTestId(MusdRescueSendSheetTestIds.AMOUNT_INPUT),
      '1',
    );
    fireEvent.press(getByTestId(MusdRescueSendSheetTestIds.SEND_BUTTON));

    await waitFor(() => {
      expect(mockInitiateRescueSend).toHaveBeenCalled();
    });
  });

  it('shows a failure message and stays open when initiation fails', async () => {
    mockInitiateRescueSend.mockRejectedValueOnce(new Error('boom'));
    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    fireEvent.changeText(
      getByTestId(MusdRescueSendSheetTestIds.RECIPIENT_INPUT),
      VALID_ADDRESS,
    );
    fireEvent.changeText(
      getByTestId(MusdRescueSendSheetTestIds.AMOUNT_INPUT),
      '1',
    );
    fireEvent.press(getByTestId(MusdRescueSendSheetTestIds.SEND_BUTTON));

    await waitFor(() => {
      expect(
        getByTestId(MusdRescueSendSheetTestIds.ERROR_MESSAGE).props.children,
      ).toBe(strings('money.musd_rescue_send.error_send_failed'));
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('tracks the send surface with the existing Money transfer sheet component', async () => {
    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    fireEvent.changeText(
      getByTestId(MusdRescueSendSheetTestIds.RECIPIENT_INPUT),
      VALID_ADDRESS,
    );
    fireEvent.changeText(
      getByTestId(MusdRescueSendSheetTestIds.AMOUNT_INPUT),
      '1',
    );
    fireEvent.press(getByTestId(MusdRescueSendSheetTestIds.SEND_BUTTON));

    expect(mockTrackSurfaceClicked).toHaveBeenCalledWith(
      expect.objectContaining({
        component_name: 'money_transfer_money_sheet_send_external',
        redirect_target: 'money_transfer',
      }),
    );
  });

  it('renders the localized Max label instead of a hard-coded string', () => {
    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    expect(
      getByTestId(MusdRescueSendSheetTestIds.MAX_BUTTON),
    ).toHaveTextContent(strings('money.musd_rescue_send.max'));
  });

  it('uses a decimal keypad on the amount field', () => {
    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    const amountInput = getByTestId(
      MusdRescueSendSheetTestIds.AMOUNT_INPUT,
    ).findByType(TextInput);

    expect(amountInput.props.keyboardType).toBe('decimal-pad');
  });

  describe('sheet chrome', () => {
    it('renders inside a dismissable bottom sheet', () => {
      const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

      expect(
        getByTestId(MusdRescueSendSheetTestIds.CONTAINER),
      ).toBeOnTheScreen();
      expect(getByTestId('bottom-sheet-header')).toBeOnTheScreen();
    });

    it('closes the sheet when the close control is pressed', () => {
      const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

      fireEvent.press(getByTestId('bottom-sheet-close-button'));

      expect(mockOnCloseBottomSheet).toHaveBeenCalledTimes(1);
    });

    it('navigates back when the sheet goBack handler is invoked', () => {
      const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

      fireEvent.press(getByTestId('bottom-sheet-go-back'));

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
