import React, { act } from 'react';
import { merge, noop } from 'lodash';
import { ToastContext } from '../../../../../../component-library/components/Toast';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import Engine from '../../../../../../core/Engine';
import {
  CustomAmountInfo,
  CustomAmountInfoProps,
  AdvancedCustomAmountInfoSkeleton,
  CustomAmountInfoSkeleton,
} from './custom-amount-info';
import { simpleSendTransactionControllerMock } from '../../../__mocks__/controllers/transaction-controller-mock';
import { transactionApprovalControllerMock } from '../../../__mocks__/controllers/approval-controller-mock';
import { otherControllersMock } from '../../../__mocks__/controllers/other-controllers-mock';
import { useTransactionPayToken } from '../../../hooks/pay/useTransactionPayToken';
import { useTransactionCustomAmount } from '../../../hooks/transactions/useTransactionCustomAmount';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { Alert, Severity } from '../../../types/alerts';
import { AlertKeys } from '../../../constants/alerts';
import {
  AlertsContextParams,
  useAlerts,
} from '../../../context/alert-system-context';
import { useTransactionCustomAmountAlerts } from '../../../hooks/transactions/useTransactionCustomAmountAlerts';
import { useAccountTokens } from '../../../hooks/send/useAccountTokens';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';
import { AssetType } from '../../../types/token';
import {
  useTransactionPayFiatPayment,
  useTransactionPayRequiredTokens,
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
} from '../../../hooks/pay/useTransactionPayData';
import { useTransactionPayHasSourceAmount } from '../../../hooks/pay/useTransactionPayHasSourceAmount';
import { strings } from '../../../../../../../locales/i18n';
import { Hex } from '@metamask/utils';
import { TransactionPayRequiredToken } from '@metamask/transaction-pay-controller';
import { useRoute } from '@react-navigation/native';
import { fireEvent } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { TransactionType } from '@metamask/transaction-controller';
import { useConfirmActions } from '../../../hooks/useConfirmActions';
import { CustomAmountInfoTestIds } from './custom-amount-info.testIds';
import { ConfirmationFooterSelectorIDs } from '../../../ConfirmationView.testIds';
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useTokenFiatRates } from '../../../hooks/tokens/useTokenFiatRates';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { useTransactionAccountOverride } from '../../../hooks/transactions/useTransactionAccountOverride';
import { useMoneyNoFeeTokens } from '../../../hooks/pay/useMoneyNoFeeTokens';
import { usePayWithMoneyAccountSection } from '../../../hooks/pay/sections/usePayWithMoneyAccountSection';
import Logger from '../../../../../../util/Logger';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { useAccountNoFundsAlert } from '../../../hooks/alerts/useAccountNoFundsAlert';
import { mockTheme } from '../../../../../../util/theme';

jest.mock('../../../hooks/ui/useClearConfirmationOnBackSwipe');
jest.mock('../../../hooks/ui/useMMPayNavigation');
jest.mock('../../../hooks/alerts/useAccountNoFundsAlert');
jest.mock('../../../hooks/tokens/useTokenFiatRates');
jest.mock('../../../hooks/pay/useAutomaticTransactionPayToken');
jest.mock('../../../hooks/pay/useTransactionPayToken');
jest.mock('../../../hooks/transactions/useTransactionCustomAmount');
jest.mock('../../../context/confirmation-context');
jest.mock('../../../context/alert-system-context');
jest.mock('../../../hooks/transactions/useTransactionCustomAmountAlerts');
jest.mock('../../../hooks/pay/useTransactionPayMetrics');
jest.mock('../../../hooks/send/useAccountTokens');
jest.mock('../../../../../UI/Predict/hooks/usePredictAccountState', () => ({
  usePredictAccountState: () => ({
    data: undefined,
    isLoading: false,
  }),
}));
jest.mock('../../../hooks/pay/useTransactionPayAvailableTokens');
jest.mock('../../../hooks/pay/useTransactionPayData');
jest.mock('../../../hooks/pay/useTransactionPayHasSourceAmount');
jest.mock('../../../hooks/pay/useTransactionPaySelectedFiatPaymentMethod');
jest.mock('../../../hooks/useConfirmActions');
jest.mock('../../../hooks/transactions/useTransactionMetadataRequest');
jest.mock('../../../hooks/pay/useTransactionPayWithdraw', () => ({
  useTransactionPayWithdraw: jest.fn(() => ({
    isWithdraw: false,
    canSelectWithdrawToken: false,
  })),
}));
jest.mock('../../../hooks/transactions/useTransactionAccountOverride');
jest.mock('../../../hooks/pay/useMoneyNoFeeTokens');
jest.mock('../../../hooks/pay/sections/usePayWithMoneyAccountSection');
jest.mock('../../rows/perps-account-picker-row', () => ({
  PerpsAccountPickerRow: () => null,
}));
jest.mock('../../rows/predict-account-picker-row', () => ({
  PredictAccountPickerRow: () => null,
}));
jest.mock('../../../../../../util/transaction-controller', () => ({}));

jest.mock('../../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      updateFiatPayment: jest.fn(),
    },
    TransactionController: {
      state: { transactions: [] },
    },
  },
}));
jest.mock('../../PayAccountSelector', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => <View testID="pay-account-selector" />,
  };
});
jest.mock('../../../../../UI/Money/components/BalanceProjection', () => ({
  BalanceProjection: () => null,
}));
jest.mock('../../../hooks/metrics/useConfirmationAlertMetrics', () => ({
  useConfirmationAlertMetrics: () => ({
    trackInlineAlertClicked: jest.fn(),
    trackAlertActionClicked: jest.fn(),
    trackAlertRendered: jest.fn(),
  }),
}));
jest.mock('../../../hooks/metrics/useConfirmationMetricEvents', () => ({
  useConfirmationMetricEvents: () => ({
    setConfirmationMetric: jest.fn(),
  }),
}));
jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: jest.fn(() => ({
      addProperties: jest.fn(() => ({ build: () => 'built-event' })),
    })),
  }),
}));

// TRAM-3623 funnel events flow through the ramps-owned typed analytics callback.
const mockRampsTrackEvent = jest.fn();
jest.mock('../../../../../UI/Ramp/hooks/useAnalytics', () => ({
  __esModule: true,
  default: () => mockRampsTrackEvent,
}));

const mockUseRampsUserRegion = jest.fn(() => ({
  userRegion: { regionCode: 'us-ca' },
  setUserRegion: jest.fn(),
}));
jest.mock('../../../../../UI/Ramp/hooks/useRampsUserRegion', () => ({
  useRampsUserRegion: () => mockUseRampsUserRegion(),
}));

/** Returns the payload for the first ramps funnel emit of `event`. */
function emittedPayloadFor(event: string): Record<string, unknown> | undefined {
  return mockRampsTrackEvent.mock.calls.find(([type]) => type === event)?.[1];
}

/** How many times the ramps funnel emitted `event`. */
function emitCount(event: string): number {
  return mockRampsTrackEvent.mock.calls.filter(([type]) => type === event)
    .length;
}

const mockGoToBuy = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: jest.fn(),
  useRoute: jest.fn(() => ({ params: {} })),
}));

jest.mock('../../../../../UI/Ramp/hooks/useRampNavigation', () => ({
  ...jest.requireActual('../../../../../UI/Ramp/hooks/useRampNavigation'),
  useRampNavigation: () => ({
    goToBuy: mockGoToBuy,
  }),
}));

jest.mock('../../../../../UI/Ramp/hooks/useHasNativeFiatProvider', () => ({
  useHasNativeFiatProvider: () => true,
}));

jest.mock('../../../../../UI/Ramp/hooks/useRampsPaymentMethods', () => ({
  useRampsPaymentMethods: () => ({
    paymentMethods: [],
    selectedPaymentMethod: null,
    setSelectedPaymentMethod: jest.fn(),
    isFetching: false,
    isLoading: false,
    status: 'idle',
    isSuccess: false,
    error: null,
  }),
}));

const TOKEN_ADDRESS_MOCK = '0x123' as Hex;
const CHAIN_ID_MOCK = '0x1' as Hex;
const TRANSACTION_ID_MOCK = 'tx-mock-id';

function setControllerTransactions(transactions: { id: string }[]) {
  (
    Engine.context.TransactionController as unknown as {
      state: { transactions: { id: string }[] };
    }
  ).state = { transactions };
}

const mockShowToast = jest.fn();
const mockToastRef = {
  current: { showToast: mockShowToast, closeToast: jest.fn() },
};

interface DeferredPromise {
  promise: Promise<void>;
  reject: (reason?: unknown) => void;
  resolve: () => void;
}

function createDeferredPromise(): DeferredPromise {
  let reject: DeferredPromise['reject'] = noop;
  let resolve: DeferredPromise['resolve'] = noop;
  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    reject = rejectPromise;
    resolve = resolvePromise;
  });

  return { promise, reject, resolve };
}

function createCustomAmountInfo(
  props: CustomAmountInfoProps & { transactionType?: TransactionType } = {},
) {
  return (
    <ToastContext.Provider value={{ toastRef: mockToastRef } as never}>
      <CustomAmountInfo {...props} />
    </ToastContext.Provider>
  );
}

function render(
  props: CustomAmountInfoProps & { transactionType?: TransactionType } = {},
) {
  return renderWithProvider(createCustomAmountInfo(props), {
    state: merge(
      {},
      simpleSendTransactionControllerMock,
      transactionApprovalControllerMock,
      otherControllersMock,
      {
        engine: {
          backgroundState: {
            TransactionController: {
              transactions: [
                {
                  type:
                    props.transactionType ||
                    TransactionType.contractInteraction,
                },
              ],
            },
          },
        },
      },
    ),
  });
}

describe('CustomAmountInfo', () => {
  const useTransactionPayTokenMock = jest.mocked(useTransactionPayToken);
  const useConfirmationContextMock = jest.mocked(useConfirmationContext);
  const useAlertsMock = jest.mocked(useAlerts);
  const useAccountTokensMock = jest.mocked(useAccountTokens);
  const useConfirmActionsMock = jest.mocked(useConfirmActions);

  const useTransactionPayFiatPaymentMock = jest.mocked(
    useTransactionPayFiatPayment,
  );

  const useTransactionPayRequiredTokensMock = jest.mocked(
    useTransactionPayRequiredTokens,
  );

  const useTransactionPayAvailableTokensMock = jest.mocked(
    useTransactionPayAvailableTokens,
  );

  const useIsTransactionPayLoadingMock = jest.mocked(
    useIsTransactionPayLoading,
  );

  const useTransactionPayQuotesMock = jest.mocked(useTransactionPayQuotes);

  const useTransactionPayHasSourceAmountMock = jest.mocked(
    useTransactionPayHasSourceAmount,
  );

  const useTransactionCustomAmountAlertsMock = jest.mocked(
    useTransactionCustomAmountAlerts,
  );

  const useTransactionCustomAmountMock = jest.mocked(
    useTransactionCustomAmount,
  );

  const useTransactionMetadataRequestMock = jest.mocked(
    useTransactionMetadataRequest,
  );

  const useTokenFiatRatesMock = jest.mocked(useTokenFiatRates);
  const useTransactionPayWithdrawMock = jest.mocked(useTransactionPayWithdraw);
  const useTransactionAccountOverrideMock = jest.mocked(
    useTransactionAccountOverride,
  );
  const useClearConfirmationOnBackSwipeMock = jest.mocked(
    useClearConfirmationOnBackSwipe,
  );
  const useMoneyNoFeeTokensMock = jest.mocked(useMoneyNoFeeTokens);
  const usePayWithMoneyAccountSectionMock = jest.mocked(
    usePayWithMoneyAccountSection,
  );
  const setIsConfirmationSubmittingMock = jest.fn();
  const useAccountNoFundsAlertMock = jest.mocked(useAccountNoFundsAlert);

  const useRouteMock = jest.mocked(useRoute);

  beforeEach(() => {
    jest.resetAllMocks();
    mockShowToast.mockReset();

    mockUseRampsUserRegion.mockReturnValue({
      userRegion: { regionCode: 'us-ca' },
      setUserRegion: jest.fn(),
    });

    useRouteMock.mockReturnValue({
      key: 'mock-route',
      name: 'MockScreen',
      params: {},
    } as never);

    useTransactionAccountOverrideMock.mockReturnValue(undefined);
    useTransactionPayFiatPaymentMock.mockReturnValue(undefined);

    useTransactionPayWithdrawMock.mockReturnValue({
      isWithdraw: false,
      canSelectWithdrawToken: false,
    });

    useTransactionPayTokenMock.mockReturnValue({
      payToken: {
        address: '0x123',
        balanceHuman: '0',
        balanceFiat: '0',
        balanceRaw: '0',
        balanceUsd: '0',
        chainId: '0x1',
        decimals: 18,
        symbol: 'TST',
      },
      setPayToken: noop as never,
    });

    useTransactionCustomAmountMock.mockReturnValue({
      amountFiat: '123.45',
      amountHuman: '0',
      amountHumanDebounced: '0',
      amountFiatDebounced: '0',
      hasInput: true,
      isDepositPrefillEnabled: false,
      isDepositPrefilled: false,
      isInputChanged: false,
      isPrefillPending: false,
      isDepositPrefillLoading: false,
      updatePendingAmount: noop,
      updatePendingAmountPercentage: noop,
      updateTokenAmount: jest.fn(),
    });

    useConfirmationContextMock.mockReturnValue({
      mmPayRequestInProgressNavHandler: { current: false },
      headlessBuyError: undefined,
      isFooterVisible: true,
      isConfirmationSubmitting: false,
      isConfirmationSubmittingRef: { current: false },
      setIsConfirmationSubmitting: setIsConfirmationSubmittingMock,
      isHeadlessBuyInProgress: false,
      isTransactionDataUpdating: false,
      isTransactionValueUpdating: false,
      setHeadlessBuyError: noop,
      setIsFooterVisible: noop,
      setIsHeadlessBuyInProgress: noop,
      setIsTransactionDataUpdating: noop,
      setIsTransactionValueUpdating: noop,
    } as ReturnType<typeof useConfirmationContext>);

    useAlertsMock.mockReturnValue({
      alerts: [] as Alert[],
      generalAlerts: [] as Alert[],
      fieldAlerts: [] as Alert[],
    } as AlertsContextParams);

    useTransactionCustomAmountAlertsMock.mockReturnValue({
      alertTitle: undefined,
      alertMessage: undefined,
    });

    useAccountTokensMock.mockReturnValue([]);
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [{}] as AssetType[],
      hasTokens: true,
    });
    useTransactionPayRequiredTokensMock.mockReturnValue([]);
    useConfirmActionsMock.mockReturnValue({
      onConfirm: jest.fn(),
      onReject: jest.fn(),
    });
    useIsTransactionPayLoadingMock.mockReturnValue(false);
    useTransactionPayQuotesMock.mockReturnValue([]);
    useTransactionPayHasSourceAmountMock.mockReturnValue(false);
    useTokenFiatRatesMock.mockReturnValue([1, 1]);
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.contractInteraction,
      txParams: { from: '0x123' },
    } as never);

    useMoneyNoFeeTokensMock.mockReturnValue({ isMoneyNoFeeToken: false });
    usePayWithMoneyAccountSectionMock.mockReturnValue(null);
    useAccountNoFundsAlertMock.mockReturnValue([]);

    setControllerTransactions([]);
  });

  it('renders amount', () => {
    const { getByText } = render();

    expect(getByText('123.45')).toBeOnTheScreen();
  });

  it('renders payment token', () => {
    const { getByText } = render();
    expect(getByText('0 TST')).toBeDefined();
  });

  it('sets up back swipe rejection', () => {
    render();

    expect(useClearConfirmationOnBackSwipeMock).toHaveBeenCalledTimes(1);
  });

  it('does not render payment token if disablePay', () => {
    const { queryByText } = render({ disablePay: true });
    expect(queryByText('TST')).toBeNull();
  });

  it('renders alert', () => {
    useTransactionCustomAmountAlertsMock.mockReturnValue({
      alertTitle: 'Test Alert Title',
      alertMessage: 'Test Alert Message',
    });

    const { getByText } = render();

    expect(getByText('Test Alert Title')).toBeDefined();
    expect(getByText('Test Alert Message')).toBeDefined();
  });

  it('renders keyboard', () => {
    const { getByTestId } = render();
    expect(getByTestId('deposit-keyboard')).toBeDefined();
  });

  describe('bottomBlock', () => {
    const originalPlatformOS = Platform.OS;

    afterEach(() => {
      Object.defineProperty(Platform, 'OS', {
        value: originalPlatformOS,
        writable: true,
      });
    });

    it('applies 16dp paddingBottom to the bottom block on Android', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
      });

      const { getByTestId } = render();

      expect(getByTestId(CustomAmountInfoTestIds.BOTTOM_BLOCK)).toHaveStyle({
        paddingBottom: 16,
      });
    });

    it('does not apply paddingBottom to the bottom block on iOS', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
      });

      const { getByTestId } = render();

      expect(getByTestId(CustomAmountInfoTestIds.BOTTOM_BLOCK)).toHaveStyle({
        paddingBottom: 0,
      });
    });
  });

  it('renders footerText when passed in', () => {
    const hint = 'Test footer text';
    const { getByText } = render({ footerText: hint });

    expect(getByText(hint)).toBeOnTheScreen();
  });

  it('does not render footerText when not passed in', () => {
    const hint = 'Test footer text';
    const { queryByText } = render();

    expect(queryByText(hint)).toBeNull();
  });

  it('renders buy button if no available tokens', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });

    const { getByText } = render();

    expect(
      getByText(strings('confirm.custom_amount.buy_button')),
    ).toBeDefined();
  });

  it('does not render buy button when money account is available', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });

    usePayWithMoneyAccountSectionMock.mockReturnValue({
      id: 'money-account',
      title: '',
      testID: 'pay-with-section-money-account',
      rows: [],
    });

    const { queryByText } = render();

    expect(queryByText(strings('confirm.custom_amount.buy_button'))).toBeNull();
  });

  it('navigates to ramps if buy button pressed', () => {
    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });

    useAccountTokensMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_MOCK,
        assetId: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
      } as AssetType,
    ]);

    useTransactionPayRequiredTokensMock.mockReturnValue([
      {
        address: TOKEN_ADDRESS_MOCK,
        chainId: CHAIN_ID_MOCK,
      },
    ] as TransactionPayRequiredToken[]);

    const { getByText } = render();

    fireEvent.press(getByText(strings('confirm.custom_amount.buy_button')));

    expect(mockGoToBuy).toHaveBeenCalledTimes(1);
    expect(mockGoToBuy).toHaveBeenCalledWith({
      assetId: 'eip155:1/erc20:0x123',
    });
  });

  it.each([TransactionType.predictWithdraw, TransactionType.perpsWithdraw])(
    'renders the withdraw confirm label for %s transactions',
    async (transactionType) => {
      useTransactionMetadataRequestMock.mockReturnValue({
        type: transactionType,
        txParams: { from: '0x123' },
      } as never);

      const { getByText, findByText } = render({ transactionType });

      await act(async () => {
        fireEvent.press(getByText(strings('confirm.edit_amount_done')));
      });

      expect(
        await findByText(
          strings('confirm.deposit_edit_amount_predict_withdraw'),
        ),
      ).toBeOnTheScreen();
    },
  );

  it.each([TransactionType.perpsDeposit, TransactionType.predictDeposit])(
    'renders "Send" confirm label for %s from Money Account',
    async (transactionType) => {
      useRouteMock.mockReturnValue({
        key: 'mock-route',
        name: 'MockScreen',
        params: { payWithOption: 'money_account' },
      } as never);

      useTransactionMetadataRequestMock.mockReturnValue({
        type: transactionType,
        txParams: { from: '0x123' },
      } as never);

      const { getByText, findByText } = render({ transactionType });

      await act(async () => {
        fireEvent.press(getByText(strings('confirm.edit_amount_done')));
      });

      expect(
        await findByText(
          strings('confirm.deposit_edit_amount_money_account_send'),
        ),
      ).toBeOnTheScreen();
    },
  );

  it('hides PayTokenAmount when hidePayTokenAmount is true', () => {
    const { queryByText } = render({ hidePayTokenAmount: true });

    expect(queryByText('0 TST')).toBeNull();
    expect(
      queryByText(new RegExp(strings('confirm.label.pay_with'))),
    ).toBeOnTheScreen();
  });

  describe('Money Account quote preparation', () => {
    function arrangePendingPreparation() {
      const deferred = createDeferredPromise();
      const updateTokenAmount = jest.fn(() => deferred.promise);
      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'money-account-deposit-transaction',
        type: TransactionType.moneyAccountDeposit,
        txParams: { from: '0x123' },
      } as never);
      useTransactionCustomAmountMock.mockReturnValue({
        ...useTransactionCustomAmountMock(),
        updateTokenAmount,
      });

      return { deferred, updateTokenAmount };
    }

    it('replaces the keypad with preparation feedback before the amount update resolves', () => {
      arrangePendingPreparation();
      const { getByTestId, getByText, queryByTestId, queryByText } = render({
        supportAccountSelection: true,
        transactionType: TransactionType.moneyAccountDeposit,
      });

      fireEvent.press(getByTestId('deposit-keyboard-done-button'));

      expect(queryByTestId('deposit-keyboard')).not.toBeOnTheScreen();
      expect(getByTestId('pay-account-selector')).toBeOnTheScreen();
      expect(getByTestId('pay-with')).toBeOnTheScreen();
      expect(
        getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
      ).toBeDisabled();
      expect(
        getByText(strings('confirm.deposit_edit_amount_done')),
      ).toBeOnTheScreen();
      expect(
        queryByText(strings('confirm.preparing_order')),
      ).not.toBeOnTheScreen();
      expect(getByTestId('bridge-fee-row-skeleton')).toBeOnTheScreen();
      expect(getByTestId('bridge-time-row-skeleton')).toBeOnTheScreen();
      expect(getByTestId('total-row-skeleton')).toBeOnTheScreen();
    });

    it('blocks review rows, amount editing, and duplicate submission during preparation', () => {
      const { updateTokenAmount } = arrangePendingPreparation();
      const { getByTestId } = render({
        supportAccountSelection: true,
        transactionType: TransactionType.moneyAccountDeposit,
      });
      const doneButton = getByTestId('deposit-keyboard-done-button');

      act(() => {
        fireEvent.press(doneButton);
        fireEvent.press(doneButton);
      });

      // Both presses occur before React rerenders, so the synchronous guard
      // must prevent the second amount update.
      expect(updateTokenAmount).toHaveBeenCalledTimes(1);
      expect(
        getByTestId(CustomAmountInfoTestIds.REVIEW_ROWS).props.pointerEvents,
      ).toBe('none');
      expect(getByTestId('custom-amount-input').props.onPress).toBeUndefined();
    });

    it('keeps the amount visually enabled during preparation', () => {
      arrangePendingPreparation();
      const { getByTestId } = render({
        transactionType: TransactionType.moneyAccountDeposit,
      });

      fireEvent.press(getByTestId('deposit-keyboard-done-button'));

      expect(getByTestId('custom-amount-input')).toHaveStyle({
        color: mockTheme.colors.text.default,
      });
      expect(getByTestId('custom-amount-symbol')).toHaveStyle({
        color: mockTheme.colors.text.default,
      });
    });

    it('keeps the loading review throughout quote loading', async () => {
      const { deferred } = arrangePendingPreparation();
      const view = render({
        transactionType: TransactionType.moneyAccountDeposit,
      });
      fireEvent.press(view.getByTestId('deposit-keyboard-done-button'));

      useIsTransactionPayLoadingMock.mockReturnValue(true);
      await act(async () => {
        deferred.resolve();
        await deferred.promise;
      });

      expect(view.getByTestId('bridge-fee-row-skeleton')).toBeOnTheScreen();
      expect(view.queryByTestId('bridge-fee-row')).not.toBeOnTheScreen();
      expect(
        view.getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
      ).toBeDisabled();
      expect(
        view.getByText(strings('confirm.deposit_edit_amount_done')),
      ).toBeOnTheScreen();
      expect(
        view.queryByText(strings('confirm.preparing_order')),
      ).not.toBeOnTheScreen();
      expect(
        view.getByTestId(CustomAmountInfoTestIds.REVIEW_ROWS).props
          .pointerEvents,
      ).toBe('none');
      expect(
        view.getByTestId('custom-amount-input').props.onPress,
      ).toBeUndefined();
    });

    it('clears local preparation when the amount update resolves', async () => {
      const { deferred } = arrangePendingPreparation();
      const view = render({
        transactionType: TransactionType.moneyAccountDeposit,
      });
      fireEvent.press(view.getByTestId('deposit-keyboard-done-button'));

      useIsTransactionPayLoadingMock.mockReturnValue(true);
      await act(async () => {
        deferred.resolve();
        await deferred.promise;
      });

      expect(view.getByTestId('bridge-fee-row-skeleton')).toBeOnTheScreen();

      useIsTransactionPayLoadingMock.mockReturnValue(false);
      view.rerender(
        createCustomAmountInfo({
          transactionType: TransactionType.moneyAccountDeposit,
        }),
      );

      expect(view.getByTestId('bridge-fee-row')).toBeOnTheScreen();
      expect(
        view.getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
      ).not.toBeDisabled();
    });

    it('keeps preparation active while the amount update is pending', async () => {
      const { deferred } = arrangePendingPreparation();
      const view = render({
        transactionType: TransactionType.moneyAccountDeposit,
      });
      fireEvent.press(view.getByTestId('deposit-keyboard-done-button'));

      useIsTransactionPayLoadingMock.mockReturnValue(true);
      view.rerender(
        createCustomAmountInfo({
          transactionType: TransactionType.moneyAccountDeposit,
        }),
      );

      expect(view.getByTestId('bridge-fee-row-skeleton')).toBeOnTheScreen();
      expect(
        view.getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
      ).toBeDisabled();

      await act(async () => {
        deferred.resolve();
        await deferred.promise;
      });
    });

    it('shows the populated post-keypad state after quote loading settles', async () => {
      const { deferred } = arrangePendingPreparation();
      const view = render({
        transactionType: TransactionType.moneyAccountDeposit,
      });
      fireEvent.press(view.getByTestId('deposit-keyboard-done-button'));
      await act(async () => {
        deferred.resolve();
        await deferred.promise;
      });
      useIsTransactionPayLoadingMock.mockReturnValue(true);
      view.rerender(
        createCustomAmountInfo({
          transactionType: TransactionType.moneyAccountDeposit,
        }),
      );

      useIsTransactionPayLoadingMock.mockReturnValue(false);
      view.rerender(
        createCustomAmountInfo({
          transactionType: TransactionType.moneyAccountDeposit,
        }),
      );

      expect(view.getByTestId('bridge-fee-row')).toBeOnTheScreen();
      expect(
        view.getByTestId(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
      ).not.toBeDisabled();
      expect(view.queryByTestId('deposit-keyboard')).not.toBeOnTheScreen();
    });

    it('restores amount entry and the existing toast after preparation fails', async () => {
      const { deferred } = arrangePendingPreparation();
      const view = render({
        transactionType: TransactionType.moneyAccountDeposit,
      });
      fireEvent.press(view.getByTestId('deposit-keyboard-done-button'));

      await act(async () => {
        deferred.reject(new Error('update failed'));
        await Promise.resolve();
      });

      expect(view.getByTestId('deposit-keyboard')).toBeOnTheScreen();
      expect(view.getByTestId('custom-amount-input').props.onPress).toEqual(
        expect.any(Function),
      );
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    it('immediately closes keyboard and disables amount editing for non-Money transactions', async () => {
      const deferred = createDeferredPromise();
      useTransactionCustomAmountMock.mockReturnValue({
        ...useTransactionCustomAmountMock(),
        updateTokenAmount: jest.fn(() => deferred.promise),
      });
      const { getByTestId, queryByTestId } = render();

      fireEvent.press(getByTestId('deposit-keyboard-done-button'));

      expect(queryByTestId('deposit-keyboard')).not.toBeOnTheScreen();
      expect(getByTestId('custom-amount-input').props.onPress).toBeUndefined();
      expect(getByTestId('bridge-fee-row-skeleton')).toBeOnTheScreen();

      await act(async () => {
        deferred.resolve();
        await deferred.promise;
      });
    });
  });

  it('calls onAmountSubmit when Done button is pressed', async () => {
    const mockOnAmountSubmit = jest.fn();

    const { getByText } = render({ onAmountSubmit: mockOnAmountSubmit });

    await act(async () => {
      fireEvent.press(getByText(strings('confirm.edit_amount_done')));
    });

    expect(mockOnAmountSubmit).toHaveBeenCalledTimes(1);
  });

  it('calls updateTokenAmount when Done is pressed', async () => {
    const updateTokenAmountMock = jest.fn();
    useTransactionCustomAmountMock.mockReturnValue({
      amountFiat: '123.45',
      amountHuman: '0',
      amountHumanDebounced: '0',
      amountFiatDebounced: '0',
      hasInput: true,
      isDepositPrefillEnabled: false,
      isDepositPrefilled: false,
      isInputChanged: false,
      isPrefillPending: false,
      isDepositPrefillLoading: false,
      updatePendingAmount: noop,
      updatePendingAmountPercentage: noop,
      updateTokenAmount: updateTokenAmountMock,
    });

    const { getByText } = render();

    await act(async () => {
      fireEvent.press(getByText(strings('confirm.edit_amount_done')));
    });

    expect(updateTokenAmountMock).toHaveBeenCalledTimes(1);
  });

  it('marks the confirmation as submitting when the confirm button is pressed', async () => {
    const onConfirmMock = jest.fn();
    useConfirmActionsMock.mockReturnValue({
      onConfirm: onConfirmMock,
      onReject: jest.fn(),
    });

    const { getByText } = render();

    await act(async () => {
      fireEvent.press(getByText(strings('confirm.edit_amount_done')));
    });

    await act(async () => {
      fireEvent.press(getByText(strings('confirm.deposit_edit_amount_done')));
    });

    expect(setIsConfirmationSubmittingMock).toHaveBeenCalledWith(true);
    expect(onConfirmMock).toHaveBeenCalledTimes(1);
  });

  it('shows toast, keeps keyboard open, and skips onAmountSubmit when updateTokenAmount rejects on Done', async () => {
    const error = new Error('update failed');
    const updateTokenAmountMock = jest.fn().mockRejectedValue(error);
    const mockOnAmountSubmit = jest.fn();
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      type: TransactionType.contractInteraction,
      txParams: { from: '0x123' },
    } as never);
    setControllerTransactions([{ id: TRANSACTION_ID_MOCK }]);
    useTransactionCustomAmountMock.mockReturnValue({
      amountFiat: '123.45',
      amountHuman: '0',
      amountHumanDebounced: '0',
      amountFiatDebounced: '0',
      hasInput: true,
      isDepositPrefillEnabled: false,
      isDepositPrefilled: false,
      isInputChanged: false,
      isPrefillPending: false,
      isDepositPrefillLoading: false,
      updatePendingAmount: noop,
      updatePendingAmountPercentage: noop,
      updateTokenAmount: updateTokenAmountMock,
    });

    const { getByText, queryByText } = render({
      onAmountSubmit: mockOnAmountSubmit,
    });

    await act(async () => {
      fireEvent.press(getByText(strings('confirm.edit_amount_done')));
    });

    expect(updateTokenAmountMock).toHaveBeenCalledTimes(1);
    // onAmountSubmit must NOT be called — keep keyboard visible for retry
    expect(mockOnAmountSubmit).not.toHaveBeenCalled();
    // Toast must be shown with the transaction-update title
    expect(mockShowToast).toHaveBeenCalledTimes(1);
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({ labelOptions: expect.any(Array) }),
    );
    // Keyboard stays open: Done button still present
    expect(queryByText(strings('confirm.edit_amount_done'))).toBeOnTheScreen();
  });

  it('does not show toast when the transaction was removed before updateTokenAmount rejects', async () => {
    const error = new Error(
      `Cannot update transaction as ID not found - ${TRANSACTION_ID_MOCK}`,
    );
    const updateTokenAmountMock = jest.fn().mockRejectedValue(error);
    const mockOnAmountSubmit = jest.fn();
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      type: TransactionType.contractInteraction,
      txParams: { from: '0x123' },
    } as never);
    // Confirmation dismissed by back navigation: the transaction is gone.
    setControllerTransactions([]);
    useTransactionCustomAmountMock.mockReturnValue({
      amountFiat: '123.45',
      amountHuman: '0',
      amountHumanDebounced: '0',
      amountFiatDebounced: '0',
      hasInput: true,
      isDepositPrefillEnabled: false,
      isDepositPrefilled: false,
      isInputChanged: false,
      isPrefillPending: false,
      isDepositPrefillLoading: false,
      updatePendingAmount: noop,
      updatePendingAmountPercentage: noop,
      updateTokenAmount: updateTokenAmountMock,
    });

    const { getByText } = render({
      onAmountSubmit: mockOnAmountSubmit,
    });

    await act(async () => {
      fireEvent.press(getByText(strings('confirm.edit_amount_done')));
    });

    expect(updateTokenAmountMock).toHaveBeenCalledTimes(1);
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockOnAmountSubmit).not.toHaveBeenCalled();
  });

  it('does not show toast when only unrelated transactions remain after the tracked one is removed', async () => {
    const error = new Error('update failed');
    const updateTokenAmountMock = jest.fn().mockRejectedValue(error);
    const mockOnAmountSubmit = jest.fn();
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      type: TransactionType.contractInteraction,
      txParams: { from: '0x123' },
    } as never);
    // Tracked transaction is gone; an unrelated one still lingers in state.
    setControllerTransactions([{ id: 'unrelated-tx-id' }]);
    useTransactionCustomAmountMock.mockReturnValue({
      amountFiat: '123.45',
      amountHuman: '0',
      amountHumanDebounced: '0',
      amountFiatDebounced: '0',
      hasInput: true,
      isDepositPrefillEnabled: false,
      isDepositPrefilled: false,
      isInputChanged: false,
      isPrefillPending: false,
      isDepositPrefillLoading: false,
      updatePendingAmount: noop,
      updatePendingAmountPercentage: noop,
      updateTokenAmount: updateTokenAmountMock,
    });

    const { getByText } = render({
      onAmountSubmit: mockOnAmountSubmit,
    });

    await act(async () => {
      fireEvent.press(getByText(strings('confirm.edit_amount_done')));
    });

    expect(updateTokenAmountMock).toHaveBeenCalledTimes(1);
    expect(mockShowToast).not.toHaveBeenCalled();
    expect(mockOnAmountSubmit).not.toHaveBeenCalled();
  });

  it('renders PayAccountSelector when supportAccountSelection is true', () => {
    const { getByTestId } = render({ supportAccountSelection: true });

    expect(getByTestId('pay-account-selector')).toBeOnTheScreen();
  });

  it('does not render PayAccountSelector when supportAccountSelection is false', () => {
    const { queryByTestId } = render({ supportAccountSelection: false });

    expect(queryByTestId('pay-account-selector')).toBeNull();
  });

  it('renders no funds alert message for moneyAccountDeposit when alert is present', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: '0x123' },
    } as never);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });

    useTransactionCustomAmountAlertsMock.mockReturnValue({
      alertTitle: strings('confirm.custom_amount.insufficient_funds'),
      alertMessage: strings('alert_system.account_no_funds.message'),
    });

    const { getAllByText } = render({
      transactionType: TransactionType.moneyAccountDeposit,
    });

    // The alert message appears in AlertMessage and in the keyboard's alertMessage
    // prop now that hasFiatOption=true (asset-provider path). Check at least one.
    expect(
      getAllByText(strings('alert_system.account_no_funds.message'))[0],
    ).toBeOnTheScreen();
  });

  it('does not render no funds alert for moneyAccountDeposit when tokens available', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: '0x123' },
    } as never);

    const { queryByText } = render({
      transactionType: TransactionType.moneyAccountDeposit,
    });

    expect(
      queryByText(strings('alert_system.account_no_funds.message')),
    ).toBeNull();
  });

  it('does not render PayAccountSelector when supportAccountSelection is true but selectedFiatPaymentMethodId exists', () => {
    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'fiat-method-1',
    } as never);

    const { queryByTestId } = render({ supportAccountSelection: true });

    expect(queryByTestId('pay-account-selector')).toBeNull();
  });

  it('renders PayAccountSelector for moneyAccountDeposit when supportAccountSelection is true', async () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: '0x123' },
    } as never);

    const { getByTestId, getByText } = render({
      supportAccountSelection: true,
      transactionType: TransactionType.moneyAccountDeposit,
    });

    await act(async () => {
      fireEvent.press(getByText(strings('confirm.edit_amount_done')));
    });

    expect(getByTestId('pay-account-selector')).toBeOnTheScreen();
  });

  describe('hasMax percentage button', () => {
    beforeEach(() => {
      // Percentage buttons only render when hasInput is false.
      useTransactionCustomAmountMock.mockReturnValue({
        amountFiat: '0',
        amountHuman: '0',
        amountHumanDebounced: '0',
        amountFiatDebounced: '0',
        hasInput: false,
        isDepositPrefillEnabled: false,
        isDepositPrefilled: false,
        isInputChanged: false,
        isPrefillPending: false,
        isDepositPrefillLoading: false,
        updatePendingAmount: noop,
        updatePendingAmountPercentage: noop,
        updateTokenAmount: jest.fn(),
      });
    });

    it('renders Max when hasMax=true and pay token is non-native', () => {
      const { getByText, queryByText } = render({ hasMax: true });

      expect(getByText('Max')).toBeOnTheScreen();
      expect(queryByText('90%')).not.toBeOnTheScreen();
    });

    it('falls back to 90% when pay token is native and the flow is not a withdraw (safeguard against sending entire native balance with no gas reserve)', () => {
      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          address: '0x123',
          balanceHuman: '0',
          balanceFiat: '0',
          balanceRaw: '0',
          balanceUsd: '0',
          chainId: '0x1',
          decimals: 18,
          symbol: 'TST',
        },
        setPayToken: noop as never,
        isNative: true,
      });

      const { getByText, queryByText } = render({ hasMax: true });

      expect(getByText('90%')).toBeOnTheScreen();
      expect(queryByText('Max')).not.toBeOnTheScreen();
    });

    it.each([
      TransactionType.perpsWithdraw,
      TransactionType.predictWithdraw,
      TransactionType.moneyAccountWithdraw,
    ])(
      'renders Max for %s even with a native destination token (pay token is destination in post-quote mode, native-gas-reserve safeguard does not apply)',
      (transactionType) => {
        useTransactionMetadataRequestMock.mockReturnValue({
          type: transactionType,
          txParams: { from: '0x123' },
        } as never);
        useTransactionPayTokenMock.mockReturnValue({
          payToken: {
            address: '0x123',
            balanceHuman: '0',
            balanceFiat: '0',
            balanceRaw: '0',
            balanceUsd: '0',
            chainId: '0x1',
            decimals: 18,
            symbol: 'TST',
          },
          setPayToken: noop as never,
          isNative: true,
        });

        const { getByText, queryByText } = render({
          hasMax: true,
          transactionType,
        });

        expect(getByText('Max')).toBeOnTheScreen();
        expect(queryByText('90%')).not.toBeOnTheScreen();
      },
    );

    it('renders 90% when hasMax is not provided', () => {
      const { getByText, queryByText } = render();

      expect(getByText('90%')).toBeOnTheScreen();
      expect(queryByText('Max')).not.toBeOnTheScreen();
    });

    it('renders Max for money deposit when useMoneyNoFeeTokens returns true', () => {
      useMoneyNoFeeTokensMock.mockReturnValue({ isMoneyNoFeeToken: true });

      const { getByText, queryByText } = render();

      expect(getByText('Max')).toBeOnTheScreen();
      expect(queryByText('90%')).not.toBeOnTheScreen();
    });

    it('renders 90% for money deposit when useMoneyNoFeeTokens returns false', () => {
      useMoneyNoFeeTokensMock.mockReturnValue({ isMoneyNoFeeToken: false });

      const { getByText, queryByText } = render();

      expect(getByText('90%')).toBeOnTheScreen();
      expect(queryByText('Max')).not.toBeOnTheScreen();
    });

    it('falls back to 90% when useMoneyNoFeeTokens is true but pay token is native', () => {
      useMoneyNoFeeTokensMock.mockReturnValue({ isMoneyNoFeeToken: true });
      useTransactionPayTokenMock.mockReturnValue({
        payToken: {
          address: '0x123',
          balanceHuman: '0',
          balanceFiat: '0',
          balanceRaw: '0',
          balanceUsd: '0',
          chainId: '0x1',
          decimals: 18,
          symbol: 'ETH',
        },
        setPayToken: noop as never,
        isNative: true,
      });

      const { getByText, queryByText } = render();

      expect(getByText('90%')).toBeOnTheScreen();
      expect(queryByText('Max')).not.toBeOnTheScreen();
    });
  });

  describe('Max auto-submit', () => {
    const updateTokenAmountMock = jest.fn();
    const updatePendingAmountPercentageMock = jest.fn();

    beforeEach(() => {
      useTransactionCustomAmountMock.mockReturnValue({
        amountFiat: '0',
        amountHuman: '0',
        amountHumanDebounced: '0',
        amountFiatDebounced: '0',
        hasInput: false,
        isDepositPrefillEnabled: false,
        isDepositPrefilled: false,
        isInputChanged: false,
        isPrefillPending: false,
        isDepositPrefillLoading: false,
        updatePendingAmount: noop,
        updatePendingAmountPercentage: updatePendingAmountPercentageMock,
        updateTokenAmount: updateTokenAmountMock,
      });
    });

    it('hides keyboard immediately when Max is pressed', async () => {
      const { getByText, queryByTestId } = render({ hasMax: true });

      expect(queryByTestId('deposit-keyboard')).toBeOnTheScreen();

      await act(async () => {
        fireEvent.press(getByText('Max'));
      });

      expect(queryByTestId('deposit-keyboard')).toBeNull();
    });

    it('calls updatePendingAmountPercentage with 100 when Max is pressed', async () => {
      const { getByText } = render({ hasMax: true });

      await act(async () => {
        fireEvent.press(getByText('Max'));
      });

      expect(updatePendingAmountPercentageMock).toHaveBeenCalledWith(100);
    });

    it('calls handleDone when amountFiat updates after Max press', async () => {
      const { getByText, rerender } = render({ hasMax: true });

      await act(async () => {
        fireEvent.press(getByText('Max'));
      });

      useTransactionCustomAmountMock.mockReturnValue({
        amountFiat: '50',
        amountHuman: '0.05',
        amountHumanDebounced: '0',
        amountFiatDebounced: '0',
        hasInput: false,
        isDepositPrefillEnabled: false,
        isDepositPrefilled: false,
        isInputChanged: false,
        isPrefillPending: false,
        isDepositPrefillLoading: false,
        updatePendingAmount: noop,
        updatePendingAmountPercentage: updatePendingAmountPercentageMock,
        updateTokenAmount: updateTokenAmountMock,
      });

      await act(async () => {
        rerender(
          <ToastContext.Provider value={{ toastRef: mockToastRef } as never}>
            <CustomAmountInfo hasMax />
          </ToastContext.Provider>,
        );
      });

      expect(updateTokenAmountMock).toHaveBeenCalledTimes(1);
    });

    it('calls onAmountSubmit after Max auto-submit completes', async () => {
      const onAmountSubmitMock = jest.fn();
      const { getByText, rerender } = render({
        hasMax: true,
        onAmountSubmit: onAmountSubmitMock,
      });

      await act(async () => {
        fireEvent.press(getByText('Max'));
      });

      useTransactionCustomAmountMock.mockReturnValue({
        amountFiat: '50',
        amountHuman: '0.05',
        amountHumanDebounced: '0',
        amountFiatDebounced: '0',
        hasInput: false,
        isDepositPrefillEnabled: false,
        isDepositPrefilled: false,
        isInputChanged: false,
        isPrefillPending: false,
        isDepositPrefillLoading: false,
        updatePendingAmount: noop,
        updatePendingAmountPercentage: updatePendingAmountPercentageMock,
        updateTokenAmount: updateTokenAmountMock,
      });

      await act(async () => {
        rerender(
          <ToastContext.Provider value={{ toastRef: mockToastRef } as never}>
            <CustomAmountInfo hasMax onAmountSubmit={onAmountSubmitMock} />
          </ToastContext.Provider>,
        );
      });

      expect(onAmountSubmitMock).toHaveBeenCalledTimes(1);
    });

    it('does not auto-submit for non-max percentages', async () => {
      const { getByText, queryByTestId } = render();

      await act(async () => {
        fireEvent.press(getByText('10%'));
      });

      expect(queryByTestId('deposit-keyboard')).toBeOnTheScreen();
      expect(updateTokenAmountMock).not.toHaveBeenCalled();
    });

    it('does not auto-submit when amountFiat stays at zero', async () => {
      const { getByText } = render({ hasMax: true });

      await act(async () => {
        fireEvent.press(getByText('Max'));
      });

      expect(updateTokenAmountMock).not.toHaveBeenCalled();
    });
  });

  describe('showPaymentDetails', () => {
    async function pressDone(
      getByText: ReturnType<typeof render>['getByText'],
    ) {
      await act(async () => {
        fireEvent.press(getByText(strings('confirm.edit_amount_done')));
      });
    }

    it('shows fee rows for same-chain payment without quotes', async () => {
      useTransactionPayHasSourceAmountMock.mockReturnValue(false);
      useTransactionPayQuotesMock.mockReturnValue([]);

      const { getByText, getByTestId } = render();
      await pressDone(getByText);

      expect(getByTestId('bridge-fee-row')).toBeOnTheScreen();
    });

    it('hides fee rows when no-quotes alert is present', async () => {
      useTransactionPayHasSourceAmountMock.mockReturnValue(false);
      useTransactionPayQuotesMock.mockReturnValue([]);
      useAlertsMock.mockReturnValue({
        alerts: [
          {
            key: AlertKeys.NoPayTokenQuotes,
            severity: Severity.Danger,
            isBlocking: true,
          },
        ] as Alert[],
        generalAlerts: [] as Alert[],
        fieldAlerts: [] as Alert[],
      } as AlertsContextParams);

      const { getByText, queryByTestId } = render();
      await pressDone(getByText);

      expect(queryByTestId('bridge-fee-row')).toBeNull();
    });

    it('shows fee rows when quotes exist regardless of source amount', async () => {
      useTransactionPayHasSourceAmountMock.mockReturnValue(true);
      useTransactionPayQuotesMock.mockReturnValue([{} as never]);

      const { getByText, getByTestId } = render();
      await pressDone(getByText);

      expect(getByTestId('bridge-fee-row')).toBeOnTheScreen();
    });
  });

  // TRAM-3623 headless ramps funnel, driven by the real adapter + ramps hook.
  // The shared money-deposit screen mounts the funnel exactly ONCE. The adapter
  // owns screen-viewed/reactive/order-proposed/continue events; selector-opened
  // is called from fiat options via the ramps selector hook, so it must NOT fire
  // here. Payloads + dedupe are proven in useFiatFunnelMetrics.test.ts.
  describe('TRAM-3623 funnel', () => {
    function setMoneyFlow({
      withQuote = false,
      withQuoteError = false,
    }: { withQuote?: boolean; withQuoteError?: boolean } = {}) {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'tx-1',
        type: TransactionType.moneyAccountDeposit,
        txParams: { from: '0x123' },
      } as never);
      setControllerTransactions([{ id: 'tx-1' }]);
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: '/payments/debit-credit-card',
        amountFiat: '100',
        caipAssetId: 'eip155:1/slip44:60',
        ...(withQuote && {
          rampsQuote: {
            provider: '/providers/transak',
            quote: { amountIn: 100, amountOut: 0.05, totalFees: 5 },
          },
        }),
      } as never);
      if (withQuoteError) {
        useAlertsMock.mockReturnValue({
          ...useAlertsMock(),
          alerts: [
            { key: AlertKeys.NoPayTokenQuotes, message: 'No quotes' },
          ] as Alert[],
        } as AlertsContextParams);
      }
    }

    it('emits RAMPS_SCREEN_VIEWED with HEADLESS / money_account / region on mount', () => {
      setMoneyFlow();

      render({ transactionType: TransactionType.moneyAccountDeposit });

      expect(emittedPayloadFor('RAMPS_SCREEN_VIEWED')).toEqual({
        location: 'Amount Input',
        ramp_type: 'HEADLESS',
        ramp_surface: 'money_account',
        region: 'us-ca',
      });
    });

    it('falls back to an empty region when the user region is unavailable', () => {
      setMoneyFlow();
      mockUseRampsUserRegion.mockReturnValue({
        userRegion: null as never,
        setUserRegion: jest.fn(),
      });

      render({ transactionType: TransactionType.moneyAccountDeposit });

      expect(emittedPayloadFor('RAMPS_SCREEN_VIEWED')).toEqual(
        expect.objectContaining({ region: '' }),
      );
    });

    it('does not fire RAMPS_ORDER_PROPOSED and shows toast when applying the amount throws on Done', async () => {
      setMoneyFlow();
      const error = new Error('update failed');
      useTransactionCustomAmountMock.mockReturnValue({
        ...useTransactionCustomAmountMock(),
        updateTokenAmount: jest.fn().mockRejectedValue(error),
      });

      const { getByText } = render({
        transactionType: TransactionType.moneyAccountDeposit,
      });

      await act(async () => {
        fireEvent.press(getByText(strings('confirm.edit_amount_done')));
      });

      // The Done handler's catch shows a toast and returns early without committing.
      expect(emittedPayloadFor('RAMPS_ORDER_PROPOSED')).toBeUndefined();
      expect(mockShowToast).toHaveBeenCalledTimes(1);
    });

    // Regression guard for FIX 2 (no double emission). Renders the REAL money
    // flow (no mock hiding the adapter/hook) and asserts EXACT call counts: the
    // single funnel mount fires each of its events exactly once.
    it('fires every money funnel event exactly once (no double emission)', async () => {
      setMoneyFlow({ withQuote: true, withQuoteError: true });
      useConfirmActionsMock.mockReturnValue({
        onConfirm: jest.fn(),
        onReject: jest.fn(),
      });

      const view = render({
        transactionType: TransactionType.moneyAccountDeposit,
      });

      await act(async () => {
        fireEvent.press(view.getByText(strings('confirm.edit_amount_done')));
      });
      useIsTransactionPayLoadingMock.mockReturnValue(true);
      view.rerender(
        createCustomAmountInfo({
          transactionType: TransactionType.moneyAccountDeposit,
        }),
      );
      useIsTransactionPayLoadingMock.mockReturnValue(false);
      view.rerender(
        createCustomAmountInfo({
          transactionType: TransactionType.moneyAccountDeposit,
        }),
      );
      await act(async () => {
        fireEvent.press(
          view.getByText(strings('confirm.deposit_edit_amount_done')),
        );
      });

      // Mount-time screen-viewed + three reactive + two imperative CTA events,
      // each exactly once from the single funnel mount.
      expect(emitCount('RAMPS_SCREEN_VIEWED')).toBe(1);
      expect(emitCount('RAMPS_PAYMENT_METHOD_SELECTED')).toBe(1);
      expect(emitCount('RAMPS_ORDER_SELECTED')).toBe(1);
      expect(emitCount('RAMPS_QUOTE_ERROR')).toBe(1);
      expect(emitCount('RAMPS_ORDER_PROPOSED')).toBe(1);
      expect(emitCount('RAMPS_CONTINUE_BUTTON_CLICKED')).toBe(1);
      // selector-opened is called from fiat options, so not emitted here.
      expect(emitCount('RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED')).toBe(0);
      // The adapter threaded the money surface through (payload proven elsewhere).
      expect(emittedPayloadFor('RAMPS_ORDER_PROPOSED')).toEqual(
        expect.objectContaining({ ramp_surface: 'money_account' }),
      );
    });

    // Money-account deposit is the only wired surface; perps / prediction /
    // withdraw / mUSD render this shared screen but resolve to an undefined
    // surface, so the funnel stays inert (reverts FIX 1).
    it.each([
      TransactionType.perpsDeposit,
      TransactionType.predictDeposit,
      TransactionType.moneyAccountWithdraw,
      TransactionType.musdConversion,
    ])('fires no RAMPS funnel events for %s on Done', async (type) => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'tx-1',
        type,
        txParams: { from: '0x123' },
      } as never);

      const { getByText } = render({ transactionType: type });

      await act(async () => {
        fireEvent.press(getByText(strings('confirm.edit_amount_done')));
      });

      expect(mockRampsTrackEvent).not.toHaveBeenCalled();
    });
  });

  describe('PayWithRow visibility for moneyAccountDeposit', () => {
    it('renders PayWithRow while keyboard is visible for non-addMusd moneyAccountDeposit', () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        type: TransactionType.moneyAccountDeposit,
        txParams: { from: '0x123' },
      } as never);

      const { getByTestId } = render({
        transactionType: TransactionType.moneyAccountDeposit,
      });

      expect(getByTestId('pay-with')).toBeOnTheScreen();
    });
  });

  describe('no-funds account with accountOverride', () => {
    function setupNoFundsWithOverride() {
      useTransactionMetadataRequestMock.mockReturnValue({
        type: TransactionType.moneyAccountDeposit,
        txParams: { from: '0x123' },
      } as never);

      useTransactionPayAvailableTokensMock.mockReturnValue({
        availableTokens: [],
        hasTokens: false,
      });

      useAccountNoFundsAlertMock.mockReturnValue([
        {
          key: AlertKeys.AccountNoFunds,
          title: 'No funds',
          message: 'No funds available',
          severity: Severity.Danger,
          isBlocking: true,
        },
      ]);

      useTransactionAccountOverrideMock.mockReturnValue('0xoverride' as never);
    }

    it('hides transaction detail rows when account has no funds and override is present', async () => {
      setupNoFundsWithOverride();

      const { getByText, queryByTestId } = render({
        transactionType: TransactionType.moneyAccountDeposit,
      });

      await act(async () => {
        fireEvent.press(getByText(strings('confirm.edit_amount_done')));
      });

      expect(queryByTestId('bridge-fee-row')).toBeNull();
    });

    it('hides buy section when account has no funds and override is present', async () => {
      setupNoFundsWithOverride();

      const { getByText, queryByText } = render({
        transactionType: TransactionType.moneyAccountDeposit,
      });

      await act(async () => {
        fireEvent.press(getByText(strings('confirm.edit_amount_done')));
      });

      expect(
        queryByText(strings('confirm.custom_amount.buy_button')),
      ).toBeNull();
    });

    it('hides buy section during loading when override is present (prevents flash)', () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        type: TransactionType.moneyAccountDeposit,
        txParams: { from: '0x123' },
      } as never);

      useTransactionPayAvailableTokensMock.mockReturnValue({
        availableTokens: [],
        hasTokens: false,
      });

      useIsTransactionPayLoadingMock.mockReturnValue(true);
      useTransactionAccountOverrideMock.mockReturnValue('0xoverride' as never);
      useAccountNoFundsAlertMock.mockReturnValue([]);

      const { queryByText } = render({
        transactionType: TransactionType.moneyAccountDeposit,
      });

      expect(
        queryByText(strings('confirm.custom_amount.buy_button')),
      ).toBeNull();
    });
  });

  describe('buy section without accountOverride', () => {
    it('shows buy section when account has no funds but no override', async () => {
      useTransactionMetadataRequestMock.mockReturnValue({
        type: TransactionType.moneyAccountDeposit,
        txParams: { from: '0x123' },
      } as never);

      useTransactionPayAvailableTokensMock.mockReturnValue({
        availableTokens: [],
        hasTokens: false,
      });

      useAccountNoFundsAlertMock.mockReturnValue([
        {
          key: AlertKeys.AccountNoFunds,
          title: 'No funds',
          message: 'No funds available',
          severity: Severity.Danger,
          isBlocking: true,
        },
      ]);

      useTransactionAccountOverrideMock.mockReturnValue(undefined);

      const { getByText } = render({
        transactionType: TransactionType.moneyAccountDeposit,
      });

      await act(async () => {
        fireEvent.press(getByText(strings('confirm.edit_amount_done')));
      });

      expect(
        getByText(strings('confirm.custom_amount.buy_button')),
      ).toBeOnTheScreen();
    });
  });

  it('invokes updateFiatPayment callback when fiat payment is active', async () => {
    const updateFiatPaymentMock = Engine.context.TransactionPayController
      .updateFiatPayment as jest.Mock;
    updateFiatPaymentMock.mockImplementation(
      ({ callback }: { callback: (fp: { amountFiat: string }) => void }) => {
        callback({ amountFiat: '' });
      },
    );

    useTransactionPayFiatPaymentMock.mockReturnValue({
      selectedPaymentMethodId: 'fiat-method-1',
    } as never);

    useTransactionMetadataRequestMock.mockReturnValue({
      id: 'tx-1',
      type: TransactionType.contractInteraction,
      txParams: { from: '0x123' },
    } as never);

    const { getByText } = render();

    await act(async () => {
      fireEvent.press(getByText(strings('confirm.edit_amount_done')));
    });

    expect(updateFiatPaymentMock).toHaveBeenCalledTimes(1);
  });

  it('closes toast via close button when amount update fails', async () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      id: TRANSACTION_ID_MOCK,
      type: TransactionType.contractInteraction,
      txParams: { from: '0x123' },
    } as never);
    setControllerTransactions([{ id: TRANSACTION_ID_MOCK }]);

    useTransactionCustomAmountMock.mockReturnValue({
      amountFiat: '123.45',
      amountHuman: '0',
      amountHumanDebounced: '0',
      amountFiatDebounced: '0',
      hasInput: true,
      isDepositPrefillEnabled: false,
      isDepositPrefilled: false,
      isInputChanged: false,
      isPrefillPending: false,
      isDepositPrefillLoading: false,
      updatePendingAmount: noop,
      updatePendingAmountPercentage: noop,
      updateTokenAmount: jest.fn().mockRejectedValue(new Error('fail')),
    });

    const { getByText } = render();

    await act(async () => {
      fireEvent.press(getByText(strings('confirm.edit_amount_done')));
    });

    const toastArg = mockShowToast.mock.calls[0][0];
    toastArg.closeButtonOptions.onPress();

    expect(mockToastRef.current.closeToast).toHaveBeenCalledTimes(1);
  });

  it('opens keyboard when custom amount input is pressed', async () => {
    useTransactionCustomAmountMock.mockReturnValue({
      amountFiat: '123.45',
      amountHuman: '0',
      amountHumanDebounced: '0',
      amountFiatDebounced: '0',
      hasInput: true,
      isDepositPrefillEnabled: true,
      isDepositPrefilled: false,
      isInputChanged: false,
      isPrefillPending: false,
      isDepositPrefillLoading: false,
      updatePendingAmount: noop,
      updatePendingAmountPercentage: noop,
      updateTokenAmount: jest.fn(),
    });

    const { getByTestId, queryByTestId } = render();

    expect(queryByTestId('deposit-keyboard')).toBeNull();

    await act(async () => {
      fireEvent.press(getByTestId('custom-amount-input'));
    });

    expect(getByTestId('deposit-keyboard')).toBeOnTheScreen();
  });

  it('renders perps buy message when no tokens available for perpsDeposit', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.perpsDeposit,
      txParams: { from: '0x123' },
    } as never);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });

    const { getByText } = render({
      transactionType: TransactionType.perpsDeposit,
    });

    expect(
      getByText(strings('confirm.custom_amount.buy_perps')),
    ).toBeOnTheScreen();
  });

  it('renders predict buy message when no tokens available for predictDeposit', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.predictDeposit,
      txParams: { from: '0x123' },
    } as never);

    useTransactionPayAvailableTokensMock.mockReturnValue({
      availableTokens: [],
      hasTokens: false,
    });

    const { getByText } = render({
      transactionType: TransactionType.predictDeposit,
    });

    expect(
      getByText(strings('confirm.custom_amount.buy_predict')),
    ).toBeOnTheScreen();
  });

  it('resets submitting state when onConfirm rejects', async () => {
    useConfirmActionsMock.mockReturnValue({
      onConfirm: jest.fn().mockRejectedValue(new Error('confirm failed')),
      onReject: jest.fn(),
    });

    const { getByText, getByTestId } = render();

    await act(async () => {
      fireEvent.press(getByText(strings('confirm.edit_amount_done')));
    });

    // handleConfirm re-throws after resetting the submitting flag.
    // Directly invoke and await the handler to prevent the unhandled rejection.
    const confirmButton = getByTestId('confirm-button');
    let pressable: typeof confirmButton | null = confirmButton;
    while (pressable && !pressable.props.onPress) {
      pressable = pressable.parent;
    }

    if (!pressable) {
      throw new Error('Could not find pressable ancestor with onPress');
    }

    try {
      await act(async () => {
        await pressable.props.onPress();
      });
    } catch {
      // Expected: handleConfirm re-throws after resetting submitting state
    }

    expect(setIsConfirmationSubmittingMock).toHaveBeenCalledWith(true);
    expect(setIsConfirmationSubmittingMock).toHaveBeenCalledWith(false);
  });

  describe('prefill auto-submit', () => {
    it('calls handleDone when isPrefillPending transitions to false', async () => {
      const updateTokenAmountMock = jest.fn();
      useTransactionCustomAmountMock.mockReturnValue({
        amountFiat: '50',
        amountHuman: '0',
        amountHumanDebounced: '0',
        amountFiatDebounced: '0',
        hasInput: true,
        isDepositPrefillEnabled: true,
        isDepositPrefilled: false,
        isInputChanged: false,
        isPrefillPending: true,
        isDepositPrefillLoading: false,
        updatePendingAmount: noop,
        updatePendingAmountPercentage: noop,
        updateTokenAmount: updateTokenAmountMock,
      });

      const { rerender } = render();

      expect(updateTokenAmountMock).not.toHaveBeenCalled();

      useTransactionCustomAmountMock.mockReturnValue({
        amountFiat: '50',
        amountHuman: '0',
        amountHumanDebounced: '0',
        amountFiatDebounced: '0',
        hasInput: true,
        isDepositPrefillEnabled: true,
        isDepositPrefilled: false,
        isInputChanged: false,
        isPrefillPending: false,
        isDepositPrefillLoading: false,
        updatePendingAmount: noop,
        updatePendingAmountPercentage: noop,
        updateTokenAmount: updateTokenAmountMock,
      });

      await act(async () => {
        rerender(
          <ToastContext.Provider value={{ toastRef: mockToastRef } as never}>
            <CustomAmountInfo />
          </ToastContext.Provider>,
        );
      });

      expect(updateTokenAmountMock).toHaveBeenCalledTimes(1);
    });

    it('auto-submits when prefill is ready and keyboard is hidden', async () => {
      const updateTokenAmountMock = jest.fn();
      const onAmountSubmitMock = jest.fn();
      useTransactionCustomAmountMock.mockReturnValue({
        amountFiat: '100',
        amountHuman: '0',
        amountHumanDebounced: '0',
        amountFiatDebounced: '0',
        hasInput: true,
        isDepositPrefillEnabled: true,
        isDepositPrefilled: true,
        isInputChanged: false,
        isPrefillPending: false,
        isDepositPrefillLoading: false,
        updatePendingAmount: noop,
        updatePendingAmountPercentage: noop,
        updateTokenAmount: updateTokenAmountMock,
      });

      render({ onAmountSubmit: onAmountSubmitMock });
      await act(async () => {
        await Promise.resolve();
      });

      expect(updateTokenAmountMock).toHaveBeenCalledTimes(1);
      expect(onAmountSubmitMock).toHaveBeenCalledTimes(1);
    });

    it('does not auto-submit while the keyboard is visible', () => {
      const updateTokenAmountMock = jest.fn();
      useTransactionCustomAmountMock.mockReturnValue({
        amountFiat: '100',
        amountHuman: '0',
        amountHumanDebounced: '0',
        amountFiatDebounced: '0',
        hasInput: true,
        isDepositPrefillEnabled: false,
        isDepositPrefilled: true,
        isInputChanged: false,
        isPrefillPending: false,
        isDepositPrefillLoading: false,
        updatePendingAmount: noop,
        updatePendingAmountPercentage: noop,
        updateTokenAmount: updateTokenAmountMock,
      });

      render();

      expect(updateTokenAmountMock).not.toHaveBeenCalled();
    });

    it('does not duplicate handleDone when user taps Done with a pending prefill', async () => {
      const updateTokenAmountMock = jest.fn();
      const onAmountSubmitMock = jest.fn();
      useTransactionCustomAmountMock.mockReturnValue({
        amountFiat: '100',
        amountHuman: '0',
        amountHumanDebounced: '0',
        amountFiatDebounced: '0',
        hasInput: true,
        isDepositPrefillEnabled: false,
        isDepositPrefilled: true,
        isInputChanged: false,
        isPrefillPending: false,
        isDepositPrefillLoading: false,
        updatePendingAmount: noop,
        updatePendingAmountPercentage: noop,
        updateTokenAmount: updateTokenAmountMock,
      });

      const { getByText } = render({ onAmountSubmit: onAmountSubmitMock });

      // Keyboard is visible → auto-submit blocked
      expect(updateTokenAmountMock).not.toHaveBeenCalled();

      // User taps Done → handleDone fires, keyboard hides, effect re-runs
      // but hasAutoSubmittedPrefill is now true so no second invocation.
      await act(async () => {
        fireEvent.press(getByText(strings('confirm.edit_amount_done')));
      });

      expect(updateTokenAmountMock).toHaveBeenCalledTimes(1);
      expect(onAmountSubmitMock).toHaveBeenCalledTimes(1);
    });
  });
});

describe('CustomAmountInfoSkeleton', () => {
  it('renders skeleton without AccountSelectorSkeleton', () => {
    const { queryByTestId } = renderWithProvider(<CustomAmountInfoSkeleton />, {
      state: merge(
        {},
        simpleSendTransactionControllerMock,
        transactionApprovalControllerMock,
        otherControllersMock,
      ),
    });

    expect(queryByTestId('account-selector-skeleton')).toBeNull();
  });
});

describe('AdvancedCustomAmountInfoSkeleton', () => {
  it('renders skeleton with AccountSelectorSkeleton', () => {
    const { getByTestId } = renderWithProvider(
      <AdvancedCustomAmountInfoSkeleton />,
      {
        state: merge(
          {},
          simpleSendTransactionControllerMock,
          transactionApprovalControllerMock,
          otherControllersMock,
        ),
      },
    );

    expect(getByTestId('account-selector-skeleton')).toBeTruthy();
    expect(getByTestId('custom-amount-skeleton')).toBeTruthy();
    expect(getByTestId('pay-with-row-skeleton')).toBeTruthy();
  });

  it('renders skeleton without account and pay-with rows when autoSelectFiatPayment param is set', () => {
    jest.mocked(useRoute).mockReturnValue({
      key: 'mock-route',
      name: 'MockScreen',
      params: { autoSelectFiatPayment: true },
    } as never);

    const { getByTestId, queryByTestId } = renderWithProvider(
      <AdvancedCustomAmountInfoSkeleton />,
      {
        state: merge(
          {},
          simpleSendTransactionControllerMock,
          transactionApprovalControllerMock,
          otherControllersMock,
        ),
      },
    );

    expect(getByTestId('custom-amount-skeleton')).toBeTruthy();
    expect(queryByTestId('account-selector-skeleton')).toBeNull();
    expect(queryByTestId('pay-with-row-skeleton')).toBeNull();
  });
});
