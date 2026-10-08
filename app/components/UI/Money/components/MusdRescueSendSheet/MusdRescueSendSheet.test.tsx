import React from 'react';
import { TextInput } from 'react-native';
import { fireEvent, waitFor } from '@testing-library/react-native';
import BigNumber from 'bignumber.js';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MusdRescueSendSheet from './MusdRescueSendSheet';
import { MusdRescueSendSheetTestIds } from '../MoneyTransferSheet/MoneyTransferSheet.testIds';
import { strings } from '../../../../../../locales/i18n';
import useMoneyAccountBalance from '../../hooks/useMoneyAccountBalance';
import useMoneyAccountMusdRescueSend from '../../hooks/useMoneyAccountMusdRescueSend';
import useMusdRescueRecipients from '../../hooks/useMusdRescueRecipients';
import { useMoneyAnalytics } from '../../hooks/useMoneyAnalytics';

jest.mock('../../hooks/useMoneyAccountBalance', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useMoneyAccountMusdRescueSend', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../hooks/useMusdRescueRecipients', () => ({
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
const mockUseMusdRescueRecipients = useMusdRescueRecipients as jest.Mock;

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      goBack: mockGoBack,
    }),
  };
});

// Uses the real design-system `BottomSheet`/`BottomSheetHeader` via the global
// testSetup mock, so the sheet's real close and goBack wiring is exercised.

const RECIPIENT_A = '0x1234567890123456789012345678901234567891';
const RECIPIENT_B = '0x2345678901234567890123456789012345678912';

const RECIPIENTS = [
  { id: 'account-1', address: RECIPIENT_A, name: 'Account 1' },
  { id: 'account-2', address: RECIPIENT_B, name: 'Account 2' },
];

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

/**
 * Opens the recipient sheet and selects the account at `index`.
 */
const selectRecipient = (
  getByTestId: ReturnType<typeof renderWithProvider>['getByTestId'],
  index = 0,
) => {
  fireEvent.press(getByTestId(MusdRescueSendSheetTestIds.RECIPIENT_SELECT));
  const option = RECIPIENTS[index];
  fireEvent.press(
    getByTestId(
      `${MusdRescueSendSheetTestIds.RECIPIENT_OPTION}-${option.address}`,
    ),
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  mockInitiateRescueSend.mockResolvedValue(undefined);
  mockUseMoneyAccountMusdRescueSend.mockReturnValue({
    initiateRescueSend: mockInitiateRescueSend,
  });
  mockUseMusdRescueRecipients.mockReturnValue({ recipients: RECIPIENTS });
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

  it('displays the exact liquid balance in a disabled amount field', () => {
    setupBalance({ liquidMusd: '99.123456' });

    const { getByTestId, getByDisplayValue } = renderWithProvider(
      <MusdRescueSendSheet />,
    );

    expect(getByDisplayValue('99.123456')).toBeOnTheScreen();
    expect(
      getByTestId(MusdRescueSendSheetTestIds.AMOUNT_INPUT).props
        .accessibilityState?.disabled,
    ).toBe(true);
  });

  it('lists only the same-SRP accounts in the recipient sheet', () => {
    const { getByTestId, queryByTestId, getByText } = renderWithProvider(
      <MusdRescueSendSheet />,
    );

    fireEvent.press(getByTestId(MusdRescueSendSheetTestIds.RECIPIENT_SELECT));

    expect(getByText('Account 1')).toBeOnTheScreen();
    expect(getByText('Account 2')).toBeOnTheScreen();
    // No free-text address entry is offered.
    expect(
      queryByTestId(MusdRescueSendSheetTestIds.RECIPIENT_OPTION),
    ).toBeNull();
  });

  it('shows the selected recipient address in the select input', () => {
    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    selectRecipient(getByTestId);

    expect(
      getByTestId(MusdRescueSendSheetTestIds.RECIPIENT_SELECT),
    ).toHaveTextContent(RECIPIENT_A);
  });

  it('uses the address as the option label when an account has no name', () => {
    mockUseMusdRescueRecipients.mockReturnValue({
      recipients: [{ ...RECIPIENTS[0], name: '' }],
    });

    const { getByTestId, getByText } = renderWithProvider(
      <MusdRescueSendSheet />,
    );

    fireEvent.press(getByTestId(MusdRescueSendSheetTestIds.RECIPIENT_SELECT));

    expect(getByText(RECIPIENT_A)).toBeOnTheScreen();
  });

  it('does not enable Send until a recipient is selected', () => {
    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    expect(
      getByTestId(MusdRescueSendSheetTestIds.SEND_BUTTON).props
        .accessibilityState?.disabled,
    ).toBe(true);
  });

  it('initiates the send with the selected recipient and full liquid balance', async () => {
    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    selectRecipient(getByTestId, 1);
    fireEvent.press(getByTestId(MusdRescueSendSheetTestIds.SEND_BUTTON));

    await waitFor(() => {
      expect(mockInitiateRescueSend).toHaveBeenCalledWith({
        recipient: RECIPIENT_B,
        amount: '99',
      });
    });
  });

  it('shows a failure message and stays open when initiation fails', async () => {
    mockInitiateRescueSend.mockRejectedValueOnce(new Error('boom'));
    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    selectRecipient(getByTestId);
    fireEvent.press(getByTestId(MusdRescueSendSheetTestIds.SEND_BUTTON));

    await waitFor(() => {
      expect(
        getByTestId(MusdRescueSendSheetTestIds.ERROR_MESSAGE).props.children,
      ).toBe(strings('money.musd_rescue_send.error_send_failed'));
    });
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('shows the vmUSD-present message when the send is blocked', async () => {
    mockInitiateRescueSend.mockRejectedValueOnce(
      Object.assign(new Error('blocked'), {
        reason: 'vmusd-balance-present',
      }),
    );
    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    selectRecipient(getByTestId);
    fireEvent.press(getByTestId(MusdRescueSendSheetTestIds.SEND_BUTTON));

    await waitFor(() => {
      expect(
        getByTestId(MusdRescueSendSheetTestIds.ERROR_MESSAGE).props.children,
      ).toBe(strings('money.musd_rescue_send.error_vmusd_balance_present'));
    });
  });

  it('tracks the send surface with the existing Money transfer sheet component', async () => {
    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    selectRecipient(getByTestId);
    fireEvent.press(getByTestId(MusdRescueSendSheetTestIds.SEND_BUTTON));

    await waitFor(() => {
      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith(
        expect.objectContaining({
          component_name: 'money_transfer_money_sheet_send_external',
          redirect_target: 'money_transfer',
        }),
      );
    });
  });

  it('uses a decimal keypad on the amount field', () => {
    const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

    const amountInput = getByTestId(
      MusdRescueSendSheetTestIds.AMOUNT_INPUT,
    ).findByType(TextInput);

    expect(amountInput.props.keyboardType).toBe('decimal-pad');
  });

  describe('sheet chrome', () => {
    it('renders the sheet container and header close control', () => {
      const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

      expect(
        getByTestId(MusdRescueSendSheetTestIds.CONTAINER),
      ).toBeOnTheScreen();
      expect(
        getByTestId(MusdRescueSendSheetTestIds.CLOSE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('dismisses the sheet when the close control is pressed', () => {
      const { getByTestId } = renderWithProvider(<MusdRescueSendSheet />);

      fireEvent.press(getByTestId(MusdRescueSendSheetTestIds.CLOSE_BUTTON));

      // The header close control is wired through the sheet ref's
      // onCloseBottomSheet, which dismisses the modal.
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });
  });
});
