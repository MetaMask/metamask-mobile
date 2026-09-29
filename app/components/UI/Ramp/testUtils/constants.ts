import { FIAT_ORDER_STATES } from '../../../../constants/on-ramp';
import {
  DepositOrderType,
  DepositOrder,
  type DepositRegion,
  type DepositPaymentMethod,
  DepositPaymentMethodDuration,
} from '../types/legacyDeposit';
import { IconName } from '../../../../component-library/components/Icons/Icon';
import {
  MOCK_USDC_TOKEN,
  MOCK_USDT_TOKEN,
  MOCK_BTC_TOKEN,
  MOCK_ETH_TOKEN,
  MOCK_USDC_SOLANA_TOKEN,
  MOCK_CRYPTOCURRENCIES,
} from './mockCryptoCurrencies';

export const MOCK_US_REGION: DepositRegion = {
  isoCode: 'US',
  flag: '🇺🇸',
  name: 'United States',
  currency: 'USD',
  phone: {
    prefix: '+1',
    placeholder: '(555) 123-4567',
    template: '(###) ###-####',
  },
  supported: true,
};

// ====== CRYPTOCURRENCIES ======
// Re-exported from constants/mockCryptoCurrencies.ts
export {
  MOCK_USDC_TOKEN,
  MOCK_USDT_TOKEN,
  MOCK_BTC_TOKEN,
  MOCK_ETH_TOKEN,
  MOCK_USDC_SOLANA_TOKEN,
  MOCK_CRYPTOCURRENCIES,
};

export const MOCK_CREDIT_DEBIT_CARD: DepositPaymentMethod = {
  id: 'credit_debit_card',
  name: 'Debit or Credit',
  duration: DepositPaymentMethodDuration.instant,
  icon: IconName.Card,
};

export const MOCK_DEPOSIT_ORDER: Partial<DepositOrder> = {
  id: 'test-order-id',
  provider: 'test-provider',
  createdAt: 1673886669608,
  fiatAmount: 100,
  totalFeesFiat: 2.5,
  cryptoAmount: 0.05,
  cryptoCurrency: MOCK_USDC_TOKEN,
  fiatCurrency: 'USD',
  network: { chainId: 'eip155:1', name: 'Ethereum' },
  status: 'COMPLETED',
  orderType: DepositOrderType.Deposit,
  walletAddress: '0x1234567890123456789012345678901234567890',
  txHash: '0x987654321',
  exchangeRate: 2000,
  networkFees: 1.25,
  partnerFees: 1.25,
  paymentMethod: MOCK_CREDIT_DEBIT_CARD,
};

export const MOCK_BANK_DETAILS_ORDER = {
  id: 'test-order-id',
  state: FIAT_ORDER_STATES.CREATED,
  data: {
    id: 'deposit-order-id',
    provider: 'test-provider',
    createdAt: Date.now(),
    fiatAmount: 100,
    fiatCurrency: 'USD',
    cryptoCurrency: MOCK_USDC_TOKEN,
    network: { chainId: 'eip155:1', name: 'Ethereum' },
    status: 'created',
    orderType: 'buy',
    walletAddress: '0x123...',
    paymentMethod: {
      id: 'sepa_bank_transfer',
      name: 'SEPA Bank Transfer',
      duration: DepositPaymentMethodDuration.oneToTwoDays,
      icon: IconName.Bank,
    },
    paymentDetails: [
      {
        fiatCurrency: 'USD',
        paymentMethod: 'sepa_bank_transfer',
        fields: [
          { name: 'Amount', value: '$100.00', id: 'amount' },
          { name: 'First Name (Beneficiary)', value: 'john', id: 'firstName' },
          { name: 'Last Name (Beneficiary)', value: 'doe', id: 'lastName' },
          { name: 'Account Number', value: '1234567890', id: 'accountNumber' },
          { name: 'Bank Name', value: 'test bank', id: 'bankName' },
          {
            name: 'Recipient Address',
            value: '456 recipient street',
            id: 'recipientAddress',
          },
          { name: 'Bank Address', value: '123 bank street', id: 'bankAddress' },
        ],
      },
    ],
  },
};

export const MOCK_ANALYTICS_DEPOSIT_ORDER = {
  id: '123',
  provider: 'DEPOSIT',
  createdAt: Date.now(),
  account: '0x1234567890123456789012345678901234567890',
  excludeFromPurchases: false,
  orderType: DepositOrderType.Deposit,
  amount: '100',
  currency: 'USD',
  cryptoAmount: '0.05',
  cryptocurrency: 'USDC',
  fee: '2.50',
  state: FIAT_ORDER_STATES.COMPLETED,
  network: 'eip155:1',
  data: {
    provider: 'TRANSAK',
    cryptoCurrency: MOCK_USDC_TOKEN,
    network: { chainId: 'eip155:1', name: 'Ethereum' },
    fiatAmount: '100',
    exchangeRate: '2000',
    totalFeesFiat: '2.50',
    networkFees: '1.25',
    partnerFees: '1.25',
    paymentMethod: MOCK_CREDIT_DEBIT_CARD,
    fiatCurrency: 'USD',
  },
};
