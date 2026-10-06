import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import BigNumber from 'bignumber.js';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MusdRescueSendSheet from './MusdRescueSendSheet';
import { MusdRescueSendSheetTestIds } from '../MoneyTransferSheet/MoneyTransferSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
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

const mockTrackBottomSheetViewed = jest.fn();
const mockTrackSurfaceClicked = jest.fn();
const mockInitiateRescueSend = jest.fn().mockResolvedValue(undefined);
const mockGoBack = jest.fn();

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
  return actual;
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
  mockInitiateRescueSend.mockResolvedValue(undefined);
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

  it('initiates the send with the recipient, amount, and current raw balance', async () => {
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

    expect(mockInitiateRescueSend).toHaveBeenCalledWith({
      recipient: VALID_ADDRESS,
      amount: '1.5',
      liquidMusdRaw: '99000000',
    });
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
      expect(mockGoBack).toHaveBeenCalled();
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

  it('tracks the rescue sheet surface click on send', async () => {
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
        component_name: 'musd_rescue_send_sheet',
        redirect_target: 'money_transfer',
      }),
    );
  });
});
