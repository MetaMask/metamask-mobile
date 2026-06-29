import BigNumber from 'bignumber.js';
import { type RampsOrder, RampsOrderStatus } from '@metamask/ramps-controller';
import { moneyFormatFiat } from './moneyFormatFiat';
import type { MoneyTransactionDisplayInfo } from '../hooks/useMoneyTransactionDisplayInfo';
import {
  moneyActivityKindToIcon,
  moneyActivityLabel,
  type MoneyActivityStatus,
} from './classifyMoneyActivity';
import { MUSD_TOKEN } from '../../Earn/constants/musd';

function getRampOrderActivityStatus(
  status: RampsOrderStatus,
): MoneyActivityStatus {
  switch (status) {
    case RampsOrderStatus.Completed:
      return 'confirmed';
    case RampsOrderStatus.Failed:
    case RampsOrderStatus.Cancelled:
    case RampsOrderStatus.IdExpired:
      return 'failed';
    default:
      return 'pending';
  }
}

function formatCryptoAmount(amount: string | number | undefined): string {
  const value = new BigNumber(amount ?? 0);
  if (!value.isFinite()) {
    return '';
  }
  return `+${value.toFormat(2)}`;
}

function getCryptoSymbol(order: RampsOrder): string {
  const symbol = order.cryptoCurrency?.symbol ?? '';
  return symbol.toUpperCase() === 'MUSD' ? MUSD_TOKEN.symbol : symbol;
}

function getPaymentMethodName(order: RampsOrder): string | undefined {
  const orderWithPayment = order as RampsOrder & {
    paymentMethod?: string | { name?: string };
  };
  const { paymentMethod } = orderWithPayment;
  if (typeof paymentMethod === 'string') {
    return paymentMethod;
  }
  return paymentMethod?.name;
}

export function rampOrderActivityDisplayInfo(
  order: RampsOrder,
): MoneyTransactionDisplayInfo {
  const status = getRampOrderActivityStatus(order.status);
  const cryptoSymbol = getCryptoSymbol(order);
  const primaryAmount = cryptoSymbol
    ? `${formatCryptoAmount(order.cryptoAmount)} ${cryptoSymbol}`
    : formatCryptoAmount(order.cryptoAmount);
  const fiatCurrency = order.fiatCurrency?.symbol;
  const fiatValue = new BigNumber(order.fiatAmount ?? 0);
  const fiatAmount =
    fiatCurrency && fiatValue.isFinite()
      ? `+${moneyFormatFiat(fiatValue, fiatCurrency)}`
      : '';

  return {
    label: moneyActivityLabel('deposited', status),
    description: getPaymentMethodName(order) ?? order.provider?.name,
    primaryAmount,
    fiatAmount,
    isIncoming: true,
    icon: moneyActivityKindToIcon('deposited'),
    status,
  };
}
