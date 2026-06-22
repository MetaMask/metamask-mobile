import {
  BuyQuote,
  DepositOrder,
  DepositOrderType,
  DepositPaymentMethodDuration,
  OrderStatusEnum,
} from '@consensys/native-ramps-sdk';
import Routes from '../../../../../constants/navigation/Routes';
import {
  FIAT_ORDER_PROVIDERS,
  FIAT_ORDER_STATES,
} from '../../../../../constants/on-ramp';
import type { FiatOrder } from '../../../../../reducers/fiatOrders/types';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { MOCK_USDC_TOKEN } from '../constants/mockCryptoCurrencies';
import type { DepositNavigationParams } from '../types/navigationParams';

export const DEV_PREVIEW_QUOTE_ID = 'dev-preview-quote-id';
export const DEV_PREVIEW_ORDER_ID = 'dev-preview-order-id';
export const DEV_PREVIEW_PROVIDER_ORDER_ID = 'dev-preview-provider-order-id';

const getStatusDescription = (state: FIAT_ORDER_STATES): string => {
  switch (state) {
    case FIAT_ORDER_STATES.COMPLETED:
      return 'Order succeeded';
    case FIAT_ORDER_STATES.FAILED:
    case FIAT_ORDER_STATES.CANCELLED:
      return 'Order failed';
    case FIAT_ORDER_STATES.PENDING:
      return 'Processing your order';
    default:
      return 'Awaiting bank transfer';
  }
};

const getOrderStatus = (state: FIAT_ORDER_STATES): OrderStatusEnum => {
  switch (state) {
    case FIAT_ORDER_STATES.COMPLETED:
      return OrderStatusEnum.Completed;
    case FIAT_ORDER_STATES.FAILED:
      return OrderStatusEnum.Failed;
    case FIAT_ORDER_STATES.CANCELLED:
      return OrderStatusEnum.Cancelled;
    case FIAT_ORDER_STATES.CREATED:
      return OrderStatusEnum.Created;
    case FIAT_ORDER_STATES.PENDING:
    default:
      return OrderStatusEnum.Pending;
  }
};

export const DEV_PREVIEW_QUOTE: BuyQuote = {
  quoteId: DEV_PREVIEW_QUOTE_ID,
  conversionPrice: 2000,
  marketConversionPrice: 2000,
  slippage: 0.01,
  fiatCurrency: 'USD',
  cryptoCurrency: 'USDC',
  paymentMethod: 'credit_debit_card',
  fiatAmount: 100,
  cryptoAmount: 0.05,
  isBuyOrSell: 'buy',
  network: 'eip155:1',
  feeDecimal: 0.025,
  totalFee: 2.5,
  feeBreakdown: [],
  nonce: 12345,
  cryptoLiquidityProvider: 'dev-preview',
  notes: [],
};

export interface DepositDevPreviewTarget {
  screen: string;
  params?: Record<string, unknown>;
}

export interface DepositDevPreviewScreen {
  label: string;
  target: DepositDevPreviewTarget;
  seedFiatOrderState?: FIAT_ORDER_STATES;
}

export const createDevPreviewFiatOrder = (
  state: FIAT_ORDER_STATES,
): FiatOrder => ({
  id: DEV_PREVIEW_ORDER_ID,
  provider: FIAT_ORDER_PROVIDERS.DEPOSIT,
  createdAt: Date.now(),
  amount: 100,
  currency: 'USD',
  cryptocurrency: 'USDC',
  cryptoAmount: 0.05,
  fee: 2.5,
  state,
  account: '0x1234567890123456789012345678901234567890',
  network: 'eip155:1',
  excludeFromPurchases: false,
  orderType: DepositOrderType.Deposit,
  data: {
    id: DEV_PREVIEW_ORDER_ID,
    provider: 'dev-preview',
    providerOrderId: DEV_PREVIEW_PROVIDER_ORDER_ID,
    createdAt: Date.now(),
    fiatAmount: 100,
    cryptoAmount: 0.05,
    fiatCurrency: 'USD',
    cryptoCurrency: MOCK_USDC_TOKEN,
    network: { chainId: 'eip155:1', name: 'Ethereum' },
    status: getOrderStatus(state),
    statusDescription: getStatusDescription(state),
    orderType: DepositOrderType.Deposit,
    walletAddress: '0x1234567890123456789012345678901234567890',
    paymentMethod: {
      id: 'sepa_bank_transfer',
      shortName: 'Bank transfer',
      name: 'Bank Transfer',
      duration: DepositPaymentMethodDuration.oneToTwoDays,
      icon: IconName.Bank,
    },
    paymentDetails: [
      {
        fiatCurrency: 'USD',
        paymentMethod: 'sepa_bank_transfer',
        fields: [
          { name: 'Amount', value: '$100.00', id: 'amount' },
          { name: 'First Name (Beneficiary)', value: 'John', id: 'firstName' },
          { name: 'Last Name (Beneficiary)', value: 'Doe', id: 'lastName' },
          { name: 'Account Number', value: '1234567890', id: 'accountNumber' },
          { name: 'Bank Name', value: 'Preview Bank', id: 'bankName' },
        ],
      },
    ],
  } as DepositOrder,
});

export const DEPOSIT_DEV_PREVIEW_SCREENS: DepositDevPreviewScreen[] = [
  {
    label: 'Build quote',
    target: { screen: Routes.DEPOSIT.BUILD_QUOTE },
  },
  {
    label: 'Enter email',
    target: { screen: Routes.DEPOSIT.ENTER_EMAIL },
  },
  {
    label: 'OTP code',
    target: {
      screen: Routes.DEPOSIT.OTP_CODE,
      params: {
        email: 'dev@example.com',
        stateToken: 'dev-preview-state-token',
      },
    },
  },
  {
    label: 'Verify identity',
    target: { screen: Routes.DEPOSIT.VERIFY_IDENTITY },
  },
  {
    label: 'Basic info',
    target: {
      screen: Routes.DEPOSIT.BASIC_INFO,
      params: { quote: DEV_PREVIEW_QUOTE },
    },
  },
  {
    label: 'Enter address',
    target: {
      screen: Routes.DEPOSIT.ENTER_ADDRESS,
      params: { quote: DEV_PREVIEW_QUOTE },
    },
  },
  {
    label: 'KYC processing',
    target: {
      screen: Routes.DEPOSIT.KYC_PROCESSING,
      params: { quote: DEV_PREVIEW_QUOTE },
    },
  },
  {
    label: 'Additional verification',
    target: {
      screen: Routes.DEPOSIT.ADDITIONAL_VERIFICATION,
      params: {
        quote: DEV_PREVIEW_QUOTE,
        kycUrl: 'https://example.com/kyc',
        workFlowRunId: 'dev-preview-workflow-run-id',
      },
    },
  },
  {
    label: 'Bank details',
    seedFiatOrderState: FIAT_ORDER_STATES.CREATED,
    target: {
      screen: Routes.DEPOSIT.BANK_DETAILS,
      params: {
        orderId: DEV_PREVIEW_ORDER_ID,
        shouldUpdate: false,
      },
    },
  },
  {
    label: 'Order processing (pending)',
    seedFiatOrderState: FIAT_ORDER_STATES.PENDING,
    target: {
      screen: Routes.DEPOSIT.ORDER_PROCESSING,
      params: { orderId: DEV_PREVIEW_ORDER_ID },
    },
  },
  {
    label: 'Order processing (completed)',
    seedFiatOrderState: FIAT_ORDER_STATES.COMPLETED,
    target: {
      screen: Routes.DEPOSIT.ORDER_PROCESSING,
      params: { orderId: DEV_PREVIEW_ORDER_ID },
    },
  },
  {
    label: 'Order details',
    seedFiatOrderState: FIAT_ORDER_STATES.COMPLETED,
    target: {
      screen: Routes.DEPOSIT.ORDER_DETAILS,
      params: { orderId: DEV_PREVIEW_ORDER_ID },
    },
  },
];

export function createDepositDevPreviewNavigationParams(
  target: DepositDevPreviewTarget,
): DepositNavigationParams {
  return { devPreviewTarget: target };
}
