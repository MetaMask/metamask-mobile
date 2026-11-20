import { isCaipAssetType } from '@metamask/utils';

export const PRICE_ALERT_DELIVERY = 'price_alert';
export const PRICE_ALERT_VERSION = 'price_alert@1';
export const PRICE_ALERT_CATEGORY = 'mm-price-alert-v1';
export const VIEW_TOKEN = 'price-alert-view-token';
export const SWAP_TOKEN = 'price-alert-swap';

interface PriceAlert {
  symbol: string;
  assetId: string;
  price: number;
  change: number;
  points: number[];
  description: string;
  kind: 'threshold' | 'movement';
  target?: number;
}

type PushData = Record<string, unknown> | undefined;

export const isPriceAlertDelivery = (data: PushData): boolean =>
  data?.mm_delivery === PRICE_ALERT_DELIVERY;

const numberField = (value: unknown): number => {
  if (typeof value !== 'string' || !/^-?\d+(\.\d+)?$/u.test(value)) {
    return NaN;
  }
  return Number(value);
};

const isPrice = (value: number): boolean =>
  Number.isFinite(value) && value > 0 && value <= 1e12;

const usd = (price: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: price >= 1 ? 2 : 8,
  }).format(price);

export function parsePriceAlert(data: PushData): PriceAlert | null {
  if (
    !data ||
    !isPriceAlertDelivery(data) ||
    data.mm_ui !== PRICE_ALERT_VERSION
  ) {
    return null;
  }
  const { symbol, asset_id: assetId, kind, direction, period, points } = data;
  const price = numberField(data.price);
  const change = numberField(data.change_pct);
  const target = numberField(data.target);
  if (
    typeof symbol !== 'string' ||
    !/^[A-Z0-9]{1,12}$/u.test(symbol) ||
    typeof assetId !== 'string' ||
    !isCaipAssetType(assetId) ||
    !isPrice(price) ||
    !Number.isFinite(change) ||
    Math.abs(change) > 1e6 ||
    typeof points !== 'string' ||
    points.length > 384
  ) {
    return null;
  }

  const prices = points.split(',').map(numberField);
  if (prices.length < 2 || prices.length > 24 || !prices.every(isPrice)) {
    return null;
  }

  if (
    kind === 'threshold' &&
    (direction === 'above' || direction === 'below') &&
    isPrice(target)
  ) {
    return {
      symbol,
      assetId,
      price,
      change,
      points: prices,
      kind,
      target,
      description: `Crossed ${direction} ${usd(target)}`,
    };
  }

  if (
    kind === 'movement' &&
    (period === '5m' || period === '1h' || period === '24h')
  ) {
    return {
      symbol,
      assetId,
      price,
      change,
      points: prices,
      kind,
      description: `Price movement · ${period}`,
    };
  }

  return null;
}

export const formatPriceAlert = (priceAlert: PriceAlert) => ({
  title: `${priceAlert.symbol}  ·  ${usd(priceAlert.price)}`,
  change: `${priceAlert.change >= 0 ? '+' : ''}${priceAlert.change}%`,
});

export const assetLink = (priceAlert: PriceAlert): string =>
  `https://link.metamask.io/asset?assetId=${encodeURIComponent(priceAlert.assetId)}&source=price_alert_notification&alert_type=${priceAlert.kind}&price_at_trigger=${priceAlert.price}`;

export const swapLink = (priceAlert: PriceAlert): string =>
  `https://link.metamask.io/swap?from=${encodeURIComponent(priceAlert.assetId)}`;

type RenderPriceAlert = (priceAlert: PriceAlert) => Promise<void>;

export async function displayWithFallback(
  data: PushData,
  render: RenderPriceAlert,
  fallback: () => Promise<void>,
): Promise<void> {
  try {
    const priceAlert = parsePriceAlert(data);
    if (priceAlert) {
      await render(priceAlert);
      return;
    }
  } catch {
    await fallback();
    return;
  }
  await fallback();
}
