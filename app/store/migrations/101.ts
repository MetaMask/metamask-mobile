import { hasProperty, isObject } from '@metamask/utils';
import { captureException } from '@sentry/react-native';
import { ensureValidState } from './util';
import { IconName } from '../../component-library/components/Icons/Icon/index';
import { brandColor } from '@metamask/design-tokens';
import {
  DepositCryptoCurrency,
  DepositPaymentMethod,
  DepositPaymentMethodDuration,
  DepositOrderType,
} from '@consensys/native-ramps-sdk';

const CRYPTO_CURRENCY_MAP: Record<string, DepositCryptoCurrency> = {
  'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA': {
    assetId: 'eip155:1/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
    chainId: 'eip155:1',
    name: 'MetaMask USD',
    symbol: 'mUSD',
    decimals: 6,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
  },
  'eip155:59144/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA': {
    assetId: 'eip155:59144/erc20:0xacA92E438df0B2401fF60dA7E4337B687a2435DA',
    chainId: 'eip155:59144',
    name: 'MetaMask USD',
    symbol: 'mUSD',
    decimals: 6,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/59144/erc20/0xaca92e438df0b2401ff60da7e4337b687a2435da.png',
  },
  'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': {
    assetId: 'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    chainId: 'eip155:1',
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.png',
  },
  'eip155:59144/erc20:0x176211869ca2b568f2a7d4ee941e073a821ee1ff': {
    assetId: 'eip155:59144/erc20:0x176211869ca2b568f2a7d4ee941e073a821ee1ff',
    chainId: 'eip155:59144',
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC',
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/59144/erc20/0x176211869ca2b568f2a7d4ee941e073a821ee1ff.png',
  },
  'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': {
    assetId: 'eip155:8453/erc20:0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
    chainId: 'eip155:8453',
    decimals: 6,
    name: 'USD Coin',
    symbol: 'USDC',
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/erc20/0x833589fcd6edb6e08f4c7c32d4f71b54bda02913.png',
  },
  'eip155:56/erc20:0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': {
    assetId: 'eip155:56/erc20:0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d',
    chainId: 'eip155:56',
    decimals: 18,
    name: 'USD Coin',
    symbol: 'USDC',
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/56/erc20/0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d.png',
  },
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v':
    {
      assetId:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      decimals: 6,
      name: 'USD Coin',
      symbol: 'USDC',
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v.png',
    },
  'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7': {
    assetId: 'eip155:1/erc20:0xdAC17F958D2ee523a2206206994597C13D831ec7',
    chainId: 'eip155:1',
    name: 'Tether USD',
    symbol: 'USDT',
    decimals: 6,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/erc20/0xdAC17F958D2ee523a2206206994597C13D831ec7.png',
  },
  'eip155:59144/erc20:0xa219439258ca9da29e9cc4ce5596924745e12b93': {
    assetId: 'eip155:59144/erc20:0xa219439258ca9da29e9cc4ce5596924745e12b93',
    chainId: 'eip155:59144',
    decimals: 6,
    name: 'Tether USD',
    symbol: 'USDT',
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/59144/erc20/0xa219439258ca9da29e9cc4ce5596924745e12b93.png',
  },
  'eip155:8453/erc20:0xfde4c96c8593536e31f229ea8f37b2ada2699bb2': {
    assetId: 'eip155:8453/erc20:0xfde4c96c8593536e31f229ea8f37b2ada2699bb2',
    chainId: 'eip155:8453',
    decimals: 6,
    name: 'Tether USD',
    symbol: 'USDT',
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/8453/erc20/0xfde4c96c8593536e31f229ea8f37b2ada2699bb2.png',
  },
  'eip155:56/erc20:0x55d398326f99059ff775485246999027b3197955': {
    assetId: 'eip155:56/erc20:0x55d398326f99059ff775485246999027b3197955',
    chainId: 'eip155:56',
    decimals: 18,
    name: 'Tether USD',
    symbol: 'USDT',
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/56/erc20/0x55d398326f99059ff775485246999027b3197955.png',
  },
  'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB':
    {
      assetId:
        'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      decimals: 6,
      name: 'Tether USD',
      symbol: 'USDT',
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/solana/5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB.png',
    },
  'eip155:1/slip44:60': {
    assetId: 'eip155:1/slip44:60',
    chainId: 'eip155:1',
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    iconUrl:
      'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/1/slip44/60.png',
  },
};

const PAYMENT_METHOD_MAP: Record<string, DepositPaymentMethod> = {
  credit_debit_card: {
    id: 'credit_debit_card',
    name: 'Debit Card',
    duration: DepositPaymentMethodDuration.instant,
    icon: IconName.Card,
  },
  sepa_bank_transfer: {
    id: 'sepa_bank_transfer',
    name: 'SEPA Bank Transfer',
    shortName: 'SEPA',
    duration: DepositPaymentMethodDuration.oneToTwoDays,
    icon: IconName.Bank,
  },
  wire_transfer: {
    id: 'wire_transfer',
    name: 'Wire Transfer',
    shortName: 'Wire',
    duration: DepositPaymentMethodDuration.oneToTwoDays,
    icon: IconName.Bank,
  },
  apple_pay: {
    id: 'apple_pay',
    name: 'Apple Pay',
    duration: DepositPaymentMethodDuration.instant,
    icon: IconName.Apple,
    iconColor: {
      light: brandColor.black,
      dark: brandColor.white,
    },
  },
};

/**
 * Migration 101: Convert deposit order string IDs back to objects
 *
 * This migration handles converting cryptoCurrency and paymentMethod string IDs
 * back to their corresponding object representations in fiatOrders deposit order data.
 *
 * Background:
 * 1. Originally these fields were objects
 * 2. Backend changes made them objects before client was ready
 * 3. A backward migration converted them to strings to fix crashes
 * 4. Now we need to convert string IDs back to objects with proper fallbacks
 *
 * Changes:
 * - Convert cryptoCurrency string IDs to DepositCryptoCurrency objects
 * - Convert paymentMethod string IDs to DepositPaymentMethod objects
 * - Only migrate orders with orderType === DepositOrderType.Deposit
 * - Gracefully handle unknown IDs by leaving them as strings
 */
export default function migrate(state: unknown): unknown {
  const migrationVersion = 101;

  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (
      !hasProperty(state, 'fiatOrders') ||
      !isObject(state.fiatOrders) ||
      !hasProperty(state.fiatOrders, 'orders') ||
      !Array.isArray(state.fiatOrders.orders)
    ) {
      return state;
    }

    const fiatOrders = state.fiatOrders;
    const orders = fiatOrders.orders;

    const migratedOrders = (orders as unknown[]).map((order: unknown) => {
      if (!isObject(order)) {
        return order;
      }

      // Only process deposit orders
      if (order.orderType !== DepositOrderType.Deposit) {
        return order;
      }

      if (!hasProperty(order, 'data') || !isObject(order.data)) {
        return order;
      }

      const depositOrderData = order.data;
      let needsUpdate = false;
      const updatedData = { ...depositOrderData };

      if (
        hasProperty(depositOrderData, 'cryptoCurrency') &&
        typeof depositOrderData.cryptoCurrency === 'string'
      ) {
        const cryptoId = depositOrderData.cryptoCurrency;
        const cryptoObject = CRYPTO_CURRENCY_MAP[cryptoId];

        if (cryptoObject) {
          updatedData.cryptoCurrency = cryptoObject;
          needsUpdate = true;
        }
      }

      if (
        hasProperty(depositOrderData, 'paymentMethod') &&
        typeof depositOrderData.paymentMethod === 'string'
      ) {
        const paymentId = depositOrderData.paymentMethod;
        const paymentObject = PAYMENT_METHOD_MAP[paymentId];

        if (paymentObject) {
          updatedData.paymentMethod = paymentObject;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        return {
          ...order,
          data: updatedData,
        };
      }

      return order;
    });

    const updatedFiatOrders = {
      ...fiatOrders,
      orders: migratedOrders,
    };

    return {
      ...state,
      fiatOrders: updatedFiatOrders,
    };
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to migrate deposit order data: ${String(
          error,
        )}`,
      ),
    );
    return state;
  }
}
