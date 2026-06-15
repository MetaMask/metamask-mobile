import React, { act } from 'react';
import { merge, noop } from 'lodash';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import {
  CustomAmountInfo,
  CustomAmountInfoProps,
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
import { useTransactionMetadataRequest } from '../../../hooks/transactions/useTransactionMetadataRequest';
import { useTokenFiatRates } from '../../../hooks/tokens/useTokenFiatRates';
import { useTransactionPayWithdraw } from '../../../hooks/pay/useTransactionPayWithdraw';
import { useTransactionAccountOverride } from '../../../hooks/transactions/useTransactionAccountOverride';
import Logger from '../../../../../../util/Logger';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { MetaMetricsEvents } from '../../../../../../core/Analytics';

jest.mock('../../../hooks/ui/useClearConfirmationOnBackSwipe');
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
jest.mock('../../../../../../util/transaction-controller', () => ({}));
jest.mock('../../../../../../util/Logger');
jest.mock('../../../../../../core/Engine', () => ({
  context: {
    TransactionPayController: {
      updateFiatPayment: jest.fn(),
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
const mockTrackEvent = jest.fn();
const mockAddProperties = jest.fn((_properties: Record<string, unknown>) => ({
  build: () => 'built-event',
}));
const mockCreateEventBuilder = jest.fn((_event: unknown) => ({
  addProperties: mockAddProperties,
}));
jest.mock('../../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const mockUseRampsUserRegion = jest.fn(() => ({
  userRegion: { regionCode: 'us-ca' },
  setUserRegion: jest.fn(),
}));
jest.mock('../../../../../UI/Ramp/hooks/useRampsUserRegion', () => ({
  useRampsUserRegion: () => mockUseRampsUserRegion(),
}));

/** Returns the addProperties payload for the first emit of `event`. */
function emittedPayloadFor(event: unknown): Record<string, unknown> | undefined {
  const callIndex = mockCreateEventBuilder.mock.calls.findIndex(
    ([arg]) => arg === event,
  );
  if (callIndex === -1) {
    return undefined;
  }
  return mockAddProperties.mock.calls[callIndex]?.[0] as Record<
    string,
    unknown
  >;
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

function render(
  props: CustomAmountInfoProps & { transactionType?: TransactionType } = {},
) {
  return renderWithProvider(<CustomAmountInfo {...props} />, {
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
  const setIsConfirmationSubmittingMock = jest.fn();

  const useRouteMock = jest.mocked(useRoute);

  beforeEach(() => {
    jest.resetAllMocks();

    // resetAllMocks clears implementations; restore the analytics capture mocks.
    mockAddProperties.mockImplementation(() => ({ build: () => 'built-event' }));
    mockCreateEventBuilder.mockImplementation(() => ({
      addProperties: mockAddProperties,
    }));
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
      isInputChanged: false,
      updatePendingAmount: noop,
      updatePendingAmountPercentage: noop,
      updateTokenAmount: jest.fn(),
    });

    useConfirmationContextMock.mockReturnValue({
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

  it('hides PayTokenAmount when hidePayTokenAmount is true', () => {
    const { queryByText } = render({ hidePayTokenAmount: true });

    expect(queryByText('0 TST')).toBeNull();
    expect(
      queryByText(new RegExp(strings('confirm.label.pay_with'))),
    ).toBeOnTheScreen();
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
      isInputChanged: false,
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

  it('still runs UI cleanup and logs the error when updateTokenAmount rejects on Done', async () => {
    const error = new Error('update failed');
    const updateTokenAmountMock = jest.fn().mockRejectedValue(error);
    const mockOnAmountSubmit = jest.fn();
    const loggerErrorMock = jest.mocked(Logger.error);
    loggerErrorMock.mockClear();

    useTransactionCustomAmountMock.mockReturnValue({
      amountFiat: '123.45',
      amountHuman: '0',
      amountHumanDebounced: '0',
      amountFiatDebounced: '0',
      hasInput: true,
      isInputChanged: false,
      updatePendingAmount: noop,
      updatePendingAmountPercentage: noop,
      updateTokenAmount: updateTokenAmountMock,
    });

    const { getByText } = render({ onAmountSubmit: mockOnAmountSubmit });

    await act(async () => {
      fireEvent.press(getByText(strings('confirm.edit_amount_done')));
    });

    expect(updateTokenAmountMock).toHaveBeenCalledTimes(1);
    expect(mockOnAmountSubmit).toHaveBeenCalledTimes(1);
    expect(loggerErrorMock).toHaveBeenCalledWith(
      error,
      expect.stringContaining('Failed to apply custom amount on Done press'),
    );
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

  it('renders PayAccountSelector for moneyAccountDeposit when supportAccountSelection is true', () => {
    useTransactionMetadataRequestMock.mockReturnValue({
      type: TransactionType.moneyAccountDeposit,
      txParams: { from: '0x123' },
    } as never);

    const { getByTestId } = render({
      supportAccountSelection: true,
      transactionType: TransactionType.moneyAccountDeposit,
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
        isInputChanged: false,
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

  // TRAM-3623 headless ramps funnel wiring through the shared screen.
  describe('TRAM-3623 funnel events', () => {
    function setMoneyDeposit() {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'tx-1',
        type: TransactionType.moneyAccountDeposit,
        txParams: { from: '0x123' },
      } as never);
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: '/payments/debit-credit-card',
        amountFiat: '100',
        caipAssetId: 'eip155:1/slip44:60',
      } as never);
    }

    it('emits RAMPS_ORDER_PROPOSED on Done press for moneyAccountDeposit', async () => {
      setMoneyDeposit();

      const { getByText } = render({
        transactionType: TransactionType.moneyAccountDeposit,
      });

      await act(async () => {
        fireEvent.press(getByText(strings('confirm.edit_amount_done')));
      });

      expect(emittedPayloadFor(MetaMetricsEvents.RAMPS_ORDER_PROPOSED)).toEqual(
        expect.objectContaining({
          ramp_type: 'HEADLESS',
          ramp_surface: 'money_account',
          region: 'us-ca',
          amount_source: 100,
        }),
      );
    });

    it('does not emit RAMPS_ORDER_PROPOSED when applying the amount throws on Done press', async () => {
      setMoneyDeposit();
      const error = new Error('update failed');
      const loggerErrorMock = jest.mocked(Logger.error);
      loggerErrorMock.mockClear();
      useTransactionCustomAmountMock.mockReturnValue({
        amountFiat: '100',
        amountHuman: '0',
        amountHumanDebounced: '0',
        amountFiatDebounced: '0',
        hasInput: true,
        isInputChanged: false,
        updatePendingAmount: noop,
        updatePendingAmountPercentage: noop,
        updateTokenAmount: jest.fn().mockRejectedValue(error),
      });

      const { getByText } = render({
        transactionType: TransactionType.moneyAccountDeposit,
      });

      await act(async () => {
        fireEvent.press(getByText(strings('confirm.edit_amount_done')));
      });

      // Amount-committed must not fire when the apply rejects; the error is
      // still logged by the Done handler's catch block.
      expect(
        emittedPayloadFor(MetaMetricsEvents.RAMPS_ORDER_PROPOSED),
      ).toBeUndefined();
      expect(loggerErrorMock).toHaveBeenCalledWith(
        error,
        expect.stringContaining('Failed to apply custom amount on Done press'),
      );
    });

    it('emits RAMPS_CONTINUE_BUTTON_CLICKED on confirm press for moneyAccountDeposit', async () => {
      setMoneyDeposit();
      useConfirmActionsMock.mockReturnValue({
        onConfirm: jest.fn(),
        onReject: jest.fn(),
      });

      const { getByText } = render({
        transactionType: TransactionType.moneyAccountDeposit,
      });

      // Commit the amount first to dismiss the keyboard and reveal the CTA.
      await act(async () => {
        fireEvent.press(getByText(strings('confirm.edit_amount_done')));
      });
      await act(async () => {
        fireEvent.press(getByText(strings('confirm.deposit_edit_amount_done')));
      });

      expect(
        emittedPayloadFor(MetaMetricsEvents.RAMPS_CONTINUE_BUTTON_CLICKED),
      ).toEqual(
        expect.objectContaining({
          ramp_type: 'HEADLESS',
          ramp_surface: 'money_account',
          region: 'us-ca',
        }),
      );
    });

    it('emits RAMPS_ORDER_SELECTED reactively when a usable quote is present', () => {
      setMoneyDeposit();
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: '/payments/debit-credit-card',
        amountFiat: '100',
        caipAssetId: 'eip155:1/slip44:60',
        rampsQuote: {
          provider: '/providers/transak',
          quote: {
            amountIn: 100,
            amountOut: 0.05,
            paymentMethod: '/payments/debit-credit-card',
            totalFees: 5,
            networkFee: 2,
            providerFee: 3,
          },
        },
      } as never);

      render({ transactionType: TransactionType.moneyAccountDeposit });

      expect(emittedPayloadFor(MetaMetricsEvents.RAMPS_ORDER_SELECTED)).toEqual(
        expect.objectContaining({
          ramp_type: 'HEADLESS',
          ramp_surface: 'money_account',
          amount_destination: 0.05,
          total_fee: 5,
        }),
      );
    });

    // Cross-flow isolation: the shared screen also serves these flows; none of
    // the money RAMPS funnel events may fire for them.
    it.each([
      TransactionType.perpsDeposit,
      TransactionType.predictDeposit,
      TransactionType.moneyAccountWithdraw,
      TransactionType.musdConversion,
    ])('fires no money RAMPS funnel events for %s on Done press', async (type) => {
      useTransactionMetadataRequestMock.mockReturnValue({
        id: 'tx-1',
        type,
        txParams: { from: '0x123' },
      } as never);
      useTransactionPayFiatPaymentMock.mockReturnValue({
        selectedPaymentMethodId: '/payments/debit-credit-card',
        amountFiat: '100',
        caipAssetId: 'eip155:1/slip44:60',
        rampsQuote: {
          provider: '/providers/transak',
          quote: { amountIn: 100, amountOut: 0.05 },
        },
      } as never);
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

      const { getByText } = render({ transactionType: type });

      await act(async () => {
        fireEvent.press(getByText(strings('confirm.edit_amount_done')));
      });

      const moneyRampEvents = [
        MetaMetricsEvents.RAMPS_ORDER_PROPOSED,
        MetaMetricsEvents.RAMPS_ORDER_SELECTED,
        MetaMetricsEvents.RAMPS_PAYMENT_METHOD_SELECTED,
        MetaMetricsEvents.RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED,
        MetaMetricsEvents.RAMPS_QUOTE_ERROR,
        MetaMetricsEvents.RAMPS_CONTINUE_BUTTON_CLICKED,
        MetaMetricsEvents.RAMPS_SCREEN_VIEWED,
      ];
      for (const event of moneyRampEvents) {
        expect(emittedPayloadFor(event)).toBeUndefined();
      }
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
