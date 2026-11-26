import React from 'react';
import { Alert, type AlertButton } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { ToastContext } from '../../../../../component-library/components/Toast';
import CardCashbackPanel from './CardCashbackPanel';
import { CashbackPanelSelectors } from './CashbackPanel.testIds';
import useRedeemableWallet from '../../hooks/useRedeemableWallet';
import useRedeemDestination from '../../hooks/useRedeemDestination';
import { withBiometricAuth } from '../../util/withBiometricAuth';
import { playSuccessNotification } from '../../../../../util/haptics';
import { useCashbackAutoPayoutPrototype } from '../../util/cashbackAutoPayoutPrototype';

const mockNavigate = jest.fn();
const mockAddListener = jest.fn(() => jest.fn());
const mockNavigation = {
  navigate: (...args: unknown[]) => mockNavigate(...args),
  addListener: (...args: unknown[]) => (mockAddListener as jest.Mock)(...args),
  getParent: () => undefined,
};
const mockStartLinkFlow = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  // Stable like the real hook, so focus effects don't re-run every render.
  useNavigation: () => mockNavigation,
  // Run focus effects like a mount effect (no navigator in these tests).
  useFocusEffect: (effect: () => void | (() => void)) =>
    jest.requireActual('react').useEffect(effect, [effect]),
}));

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../../selectors/cardController', () => ({
  selectCardHomeDataStatus: () => 'success',
}));

const mockAccountByAddress = jest.fn();
jest.mock('../../../../../selectors/accountsController', () => ({
  getMemoizedInternalAccountByAddress: (_state: unknown, address: string) =>
    mockAccountByAddress(address),
}));

jest.mock('../../../../../core/Authentication/hooks/useAuthentication', () => ({
  __esModule: true,
  default: () => ({ reauthenticate: jest.fn() }),
}));

jest.mock('../../util/cashbackAutoPayoutPrototype', () => ({
  useCashbackAutoPayoutPrototype: jest.fn(() => false),
}));
jest.mock('../../hooks/useRedeemableWallet');
jest.mock('../../hooks/useRedeemDestination');
jest.mock('../../hooks/useMoneyAccountCardLinkage', () => ({
  useMoneyAccountCardLinkage: () => ({
    startLinkFlow: mockStartLinkFlow,
    canLink: true,
  }),
}));
jest.mock('../../util/withBiometricAuth', () => ({
  withBiometricAuth: jest.fn(async ({ onSuccess }) => onSuccess()),
}));
jest.mock('../../../../../util/haptics', () => ({
  playSuccessNotification: jest.fn(() => Promise.resolve()),
}));

const mockWithdraw = jest.fn();
const mockResetWithdraw = jest.fn();
const mockShowToast = jest.fn();

const walletState = (
  overrides: Partial<ReturnType<typeof useRedeemableWallet>> = {},
) =>
  ({
    wallet: { balance: '12.30', currency: 'musd', isWithdrawable: true },
    isLoading: false,
    error: null,
    estimation: { price: '0', network: 'monad', currency: 'musd' },
    isEstimating: false,
    fetchEstimation: jest.fn(() => Promise.resolve()),
    withdraw: mockWithdraw,
    isWithdrawing: false,
    withdrawError: null,
    monitoringStatus: 'idle',
    monitoringError: null,
    resetWithdraw: mockResetWithdraw,
    ...overrides,
  }) as unknown as ReturnType<typeof useRedeemableWallet>;

const destinationState = (
  overrides: Partial<ReturnType<typeof useRedeemDestination>> = {},
) =>
  ({
    caipChainId: 'eip155:143',
    symbol: 'musd',
    isResolved: true,
    isMoneyAccountDestination: true,
    hasApprovedDestination: true,
    delegationToken: null,
    receivingAddress: undefined,
    ...overrides,
  }) as ReturnType<typeof useRedeemDestination>;

const renderPanel = (
  props: React.ComponentProps<typeof CardCashbackPanel> = {},
) =>
  render(
    <ToastContext.Provider
      value={
        {
          toastRef: {
            current: { showToast: mockShowToast, closeToast: jest.fn() },
          },
        } as never
      }
    >
      <CardCashbackPanel {...props} />
    </ToastContext.Provider>,
  );

const alertButtons = (): AlertButton[] =>
  (jest.mocked(Alert.alert).mock.calls[0][2] ?? []) as AlertButton[];

describe('CardCashbackPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    jest.mocked(useRedeemableWallet).mockReturnValue(walletState());
    jest.mocked(useRedeemDestination).mockReturnValue(destinationState());
    mockAccountByAddress.mockReturnValue(undefined);
    jest.mocked(useCashbackAutoPayoutPrototype).mockReturnValue(false);
  });

  it('shows the ring layout instead of the panel for the ring variant', () => {
    const { getByTestId, queryByTestId } = renderPanel({ variant: 'ring' });

    expect(
      getByTestId(CashbackPanelSelectors.RING_CONTAINER),
    ).toBeOnTheScreen();
    expect(queryByTestId(CashbackPanelSelectors.CONTAINER)).toBeNull();
  });

  it('shows the whole-increment amount as ready to claim', () => {
    const { getByTestId } = renderPanel();

    expect(getByTestId(CashbackPanelSelectors.PILL)).toHaveTextContent(
      '$10.00',
    );
    expect(getByTestId(CashbackPanelSelectors.SUBLABEL)).toHaveTextContent(
      strings('card.card_home.cashback_panel.ready'),
    );
  });

  it('asks for confirmation before claiming to the Money account', () => {
    const { getByTestId } = renderPanel();

    fireEvent.press(getByTestId(CashbackPanelSelectors.PILL));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Claim $10.00 cashback?',
      'It goes to your Money account.',
      expect.any(Array),
    );
    expect(alertButtons().map((button) => button.text)).toEqual([
      'Cancel',
      'Claim',
    ]);
    expect(alertButtons()[0].style).toBe('cancel');
    expect(withBiometricAuth).not.toHaveBeenCalled();
  });

  it('does nothing when the confirmation is cancelled', () => {
    const { getByTestId } = renderPanel();
    fireEvent.press(getByTestId(CashbackPanelSelectors.PILL));

    alertButtons()[0].onPress?.();

    expect(withBiometricAuth).not.toHaveBeenCalled();
    expect(mockWithdraw).not.toHaveBeenCalled();
  });

  it('claims only the $5 multiple after biometrics when confirmed', async () => {
    const { getByTestId } = renderPanel();
    fireEvent.press(getByTestId(CashbackPanelSelectors.PILL));

    await act(async () => {
      alertButtons()[1].onPress?.();
    });

    expect(withBiometricAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        passwordDescription: strings(
          'card.card_home.cashback_panel.password_description',
        ),
      }),
    );
    expect(mockWithdraw).toHaveBeenCalledWith('10.00');
  });

  it('names the wallet in the confirmation for Linea and Base', () => {
    jest.mocked(useRedeemDestination).mockReturnValue(
      destinationState({
        isMoneyAccountDestination: false,
        receivingAddress: '0x924A44B5b4FD33e5C4b14765d7168dFa6fAC4395',
      }),
    );
    mockAccountByAddress.mockReturnValue({ metadata: { name: 'Account 2' } });
    const { getByTestId } = renderPanel();

    fireEvent.press(getByTestId(CashbackPanelSelectors.PILL));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Claim $10.00 cashback?',
      'It goes to Account 2.',
      expect.any(Array),
    );
    expect(getByTestId(CashbackPanelSelectors.SUBLABEL)).toHaveTextContent(
      strings('card.card_home.cashback_panel.ready'),
    );
  });

  it('shows a spinner state while the payout is in flight', () => {
    jest
      .mocked(useRedeemableWallet)
      .mockReturnValue(walletState({ monitoringStatus: 'monitoring' }));
    const { getByTestId } = renderPanel();

    expect(getByTestId(CashbackPanelSelectors.SUBLABEL)).toHaveTextContent(
      strings('card.card_home.cashback_panel.claiming'),
    );
  });

  it('celebrates a successful payout, then toasts once the rain ends', () => {
    const onCelebrate = jest.fn();
    jest
      .mocked(useRedeemableWallet)
      .mockReturnValue(walletState({ monitoringStatus: 'success' }));

    renderPanel({ onCelebrate });

    expect(playSuccessNotification).toHaveBeenCalled();
    expect(onCelebrate).toHaveBeenCalledTimes(1);
    expect(mockResetWithdraw).toHaveBeenCalled();
    expect(mockShowToast).not.toHaveBeenCalled();

    act(() => onCelebrate.mock.calls[0][0]());

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          {
            label: strings(
              'card.card_home.cashback_panel.payout_toast_generic',
            ),
          },
        ],
      }),
    );
  });

  it('shows a failure toast when the payout fails', () => {
    jest
      .mocked(useRedeemableWallet)
      .mockReturnValue(walletState({ monitoringStatus: 'failed' }));

    renderPanel();

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          { label: strings('card.card_home.cashback_panel.payout_failed') },
        ],
      }),
    );
  });

  it('refills the bar after Card home comes into focus, then shimmers', async () => {
    const { findByTestId, queryByTestId } = renderPanel();

    // Empty while Card home is still transitioning in.
    expect(queryByTestId(CashbackPanelSelectors.PROGRESS_SHIMMER)).toBeNull();
    expect(mockAddListener).toHaveBeenCalledWith(
      'transitionEnd',
      expect.any(Function),
    );

    // The transition fallback fires, the fill runs, then the shimmer starts.
    expect(
      await findByTestId(
        CashbackPanelSelectors.PROGRESS_SHIMMER,
        {},
        { timeout: 3000 },
      ),
    ).toBeOnTheScreen();
  });

  it('plays the push payout celebration after the screen settles', () => {
    jest.useFakeTimers();
    const onCelebrate = jest.fn();
    const onPushPayoutHandled = jest.fn();

    renderPanel({
      pushPayoutAmount: '10.00',
      onPushPayoutHandled,
      onCelebrate,
    });

    expect(onCelebrate).not.toHaveBeenCalled();
    expect(mockAddListener).toHaveBeenCalledWith(
      'transitionEnd',
      expect.any(Function),
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(onCelebrate).toHaveBeenCalledTimes(1);
    expect(onPushPayoutHandled).toHaveBeenCalledTimes(1);
    act(() => onCelebrate.mock.calls[0][0]());
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        labelOptions: [
          {
            label: strings('card.card_home.cashback_panel.payout_toast', {
              amount: '$10.00',
            }),
          },
        ],
      }),
    );
    jest.useRealTimers();
  });

  it('starts Money account setup from the pill when it is missing', () => {
    jest
      .mocked(useRedeemDestination)
      .mockReturnValue(destinationState({ hasApprovedDestination: false }));
    const { getByTestId } = renderPanel();

    fireEvent.press(getByTestId(CashbackPanelSelectors.PILL));

    expect(mockStartLinkFlow).toHaveBeenCalled();
  });

  it('opens Linea funding setup when the wallet destination is not approved', () => {
    jest.mocked(useRedeemDestination).mockReturnValue(
      destinationState({
        isMoneyAccountDestination: false,
        hasApprovedDestination: false,
        receivingAddress: '0x924A44B5b4FD33e5C4b14765d7168dFa6fAC4395',
      }),
    );
    const { getByTestId } = renderPanel();

    fireEvent.press(getByTestId(CashbackPanelSelectors.PILL));

    expect(mockNavigate).toHaveBeenCalledWith(
      'CardSpendingLimit',
      expect.objectContaining({ flow: 'enable' }),
    );
  });

  it('shows the auto payout state when the prototype toggle is on', () => {
    jest.mocked(useCashbackAutoPayoutPrototype).mockReturnValue(true);
    const { getByTestId } = renderPanel();

    expect(getByTestId(CashbackPanelSelectors.SUBLABEL)).toHaveTextContent(
      strings('card.card_home.cashback_panel.auto_payout', { target: '$5' }),
    );
  });
});
