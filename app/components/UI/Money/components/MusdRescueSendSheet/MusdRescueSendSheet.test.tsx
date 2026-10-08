import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import BigNumber from 'bignumber.js';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MusdRescueSendScreen from './MusdRescueSendSheet';
import { MusdRescueSendTestIds } from './testIds';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
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

jest.mock('../../hooks/useMoneyNavigation', () => ({
  __esModule: true,
  useMoneyNavigation: () => ({ navigateToMoneyHome: jest.fn() }),
}));

// Maskicon crashes on undefined addresses in some rendered states; stub the
// avatars (the global testSetup mock covers design-system internals).
jest.mock('@metamask/design-system-react-native', () => {
  const actual = jest.requireActual(
    '@metamask/design-system-react-native',
  ) as Record<string, unknown>;
  const { View } = jest.requireActual(
    'react-native',
  ) as typeof import('react-native');
  return {
    ...actual,
    AvatarAccount: ({ testID }: { testID?: string }) => (
      <View testID={testID} />
    ),
  };
});

const mockTrackBottomSheetViewed = jest.fn();
const mockTrackSurfaceClicked = jest.fn();
const mockInitiateRescueSend = jest.fn().mockResolvedValue(undefined);
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockPopTo = jest.fn();
const mockNavigateToMoneyHome = jest.fn();

const mockUseMoneyAccountBalance = useMoneyAccountBalance as jest.Mock;
const mockUseMoneyAccountMusdRescueSend =
  useMoneyAccountMusdRescueSend as jest.Mock;
const mockUseMusdRescueRecipients = useMusdRescueRecipients as jest.Mock;

const RECIPIENT_A = '0x1234567890123456789012345678901234567891';
const RECIPIENT_B = '0x2345678901234567890123456789012345678912';

const RECIPIENTS = [
  {
    id: 'account-1',
    address: RECIPIENT_A,
    name: 'Account 1',
    groupName: 'Group 0',
    groupId: 'entropy:e1/0',
  },
  {
    id: 'account-2',
    address: RECIPIENT_B,
    name: 'Account 2',
    groupName: 'Group 1',
    groupId: 'entropy:e1/1',
  },
];

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      popTo: mockPopTo,
    }),
    useRoute: () => ({
      params: { recipientId: 'account-1' },
    }),
  };
});

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
  mockUseMusdRescueRecipients.mockReturnValue({ recipients: RECIPIENTS });
  (useMoneyAnalytics as jest.Mock).mockReturnValue({
    trackBottomSheetViewed: mockTrackBottomSheetViewed,
    trackSurfaceClicked: mockTrackSurfaceClicked,
  });
  setupBalance();
});

describe('MusdRescueSendScreen', () => {
  it('renders the title, locked amount, and info banner', () => {
    const { getByTestId } = renderWithProvider(<MusdRescueSendScreen />);

    expect(getByTestId(MusdRescueSendTestIds.AMOUNT)).toHaveTextContent(
      '$99.00',
    );
    expect(getByTestId(MusdRescueSendTestIds.BANNER)).toBeOnTheScreen();
    expect(getByTestId(MusdRescueSendTestIds.SEND_BUTTON)).toBeOnTheScreen();
  });

  it('tracks the screen view on mount', () => {
    renderWithProvider(<MusdRescueSendScreen />);

    expect(mockTrackBottomSheetViewed).toHaveBeenCalledTimes(1);
  });

  it('shows the balance-unavailable message while loading', () => {
    setupBalance({ liquidMusd: undefined, isLoading: true });

    const { getByTestId } = renderWithProvider(<MusdRescueSendScreen />);

    expect(getByTestId(MusdRescueSendTestIds.AMOUNT).props.children).toBe(
      strings('money.musd_rescue_send.error_balance_unavailable'),
    );
  });

  it('blocks the send while the balance is unavailable', () => {
    setupBalance({ liquidMusd: undefined, isError: true });

    const { getByTestId } = renderWithProvider(<MusdRescueSendScreen />);

    const sendButton = getByTestId(MusdRescueSendTestIds.SEND_BUTTON);
    // Design-system Button exposes disabled via accessibilityState.
    expect(sendButton.props.accessibilityState?.disabled).toBe(true);
    expect(mockInitiateRescueSend).not.toHaveBeenCalled();
  });

  it('disables the send button when no eligible recipient is selected', () => {
    mockUseMusdRescueRecipients.mockReturnValue({ recipients: [] });

    const { getByTestId } = renderWithProvider(<MusdRescueSendScreen />);

    expect(
      getByTestId(MusdRescueSendTestIds.SEND_BUTTON).props.accessibilityState
        ?.disabled,
    ).toBe(true);
  });

  it('navigates to the recipient screen with the current selection', () => {
    const { getByTestId } = renderWithProvider(<MusdRescueSendScreen />);

    fireEvent.press(getByTestId(`${MusdRescueSendTestIds.TO_ROW}-pressable`));

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.MONEY.MUSD_RESCUE_RECIPIENT,
      { selectedRecipientId: 'account-1' },
    );
  });

  it('initiates the send with the selected recipient and full liquid balance', async () => {
    const { getByTestId } = renderWithProvider(<MusdRescueSendScreen />);

    fireEvent.press(getByTestId(MusdRescueSendTestIds.SEND_BUTTON));

    await waitFor(() => {
      expect(mockInitiateRescueSend).toHaveBeenCalledWith({
        recipient: RECIPIENT_A,
        amount: '99',
        sameSrpAddresses: [RECIPIENT_A, RECIPIENT_B],
      });
    });
  });

  it('shows a failure message and stays on the screen when preparation fails', async () => {
    mockInitiateRescueSend.mockRejectedValueOnce(new Error('boom'));
    const { getByTestId } = renderWithProvider(<MusdRescueSendScreen />);

    fireEvent.press(getByTestId(MusdRescueSendTestIds.SEND_BUTTON));

    await waitFor(() => {
      expect(
        getByTestId(MusdRescueSendTestIds.ERROR_MESSAGE).props.children,
      ).toBe(strings('money.musd_rescue_send.error_send_failed'));
    });
    expect(mockGoBack).not.toHaveBeenCalled();
    expect(mockNavigateToMoneyHome).not.toHaveBeenCalled();
  });

  it('shows the vmUSD-present message when the send is blocked', async () => {
    mockInitiateRescueSend.mockRejectedValueOnce(
      Object.assign(new Error('blocked'), {
        reason: 'vmusd-balance-present',
      }),
    );
    const { getByTestId } = renderWithProvider(<MusdRescueSendScreen />);

    fireEvent.press(getByTestId(MusdRescueSendTestIds.SEND_BUTTON));

    await waitFor(() => {
      expect(
        getByTestId(MusdRescueSendTestIds.ERROR_MESSAGE).props.children,
      ).toBe(strings('money.musd_rescue_send.error_vmusd_balance_present'));
    });
  });

  it('tracks the send surface with the existing Money transfer sheet component', async () => {
    const { getByTestId } = renderWithProvider(<MusdRescueSendScreen />);

    fireEvent.press(getByTestId(MusdRescueSendTestIds.SEND_BUTTON));

    await waitFor(() => {
      expect(mockTrackSurfaceClicked).toHaveBeenCalledWith(
        expect.objectContaining({
          component_name: 'money_transfer_money_sheet_send_external',
          redirect_target: 'money_transfer',
        }),
      );
    });
  });
});
