/**
 * Characterization of every displayed perps number format Mobile renders.
 * Each row pins the output a screen shows for an input, so a formatter change
 * shows up here as an explicit expectation diff.
 */
import type { OrderFill } from '@metamask/perps-controller';
import I18n from '../../../../../locales/i18n';
import {
  formatFundingRate,
  formatLiquidationDistance,
  formatPercentage,
  formatPerpsFiat,
  formatPnl,
  formatPositionSize,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_UNIVERSAL,
} from './formatUtils';
import { formatTwapProgressPercent } from './twapFormat';
import { formatFeeRate } from '../hooks/usePerpsOrderFees';
import { transformFillsToTransactions } from './transactionTransforms';

const MISSING_INPUTS = [undefined, null, '', 'abc', Number.NaN] as const;

const describeInput = (value: unknown) =>
  typeof value === 'number' && Number.isNaN(value)
    ? 'NaN'
    : (JSON.stringify(value) ?? 'undefined');

const table = <TInput>(
  inputs: readonly TInput[],
  format: (input: TInput) => string | undefined,
) =>
  Object.fromEntries(
    inputs.map((input) => {
      try {
        return [describeInput(input), format(input)];
      } catch (error) {
        return [describeInput(input), `throws ${(error as Error).message}`];
      }
    }),
  );

const closeFill = (pnl: string, fee: string): OrderFill => ({
  orderId: `order-${pnl}`,
  symbol: 'BTC',
  side: 'sell',
  size: '0.01',
  price: '75000',
  pnl,
  direction: 'Close Long',
  fee,
  feeToken: 'USDC',
  timestamp: 1_700_000_000_000,
});

describe('perps display format characterization', () => {
  const originalLocale = I18n.locale;

  afterEach(() => {
    I18n.locale = originalLocale;
  });

  it('formats PnL', () => {
    const formatted = table(
      [1234.5, -500, 0, -0.004, 0.004, 1234567.891, ...MISSING_INPUTS],
      (value) => formatPnl(value as number),
    );

    expect(formatted).toMatchInlineSnapshot(`
      {
        """": "$---",
        ""abc"": "$---",
        "-0.004": "+$0.00",
        "-500": "-$500.00",
        "0": "+$0.00",
        "0.004": "+$0.00",
        "1234.5": "+$1,234.50",
        "1234567.891": "+$1,234,567.89",
        "NaN": "$---",
        "null": "$---",
        "undefined": "$---",
      }
    `);
  });

  it('formats percentages at default and RoE precision', () => {
    const formatted = table(
      [5.25, -2.75, 0, -0.004, 1234.56, 10.25, ...MISSING_INPUTS],
      (value) => formatPercentage(value as number),
    );

    expect(formatted).toMatchInlineSnapshot(`
      {
        """": "--%",
        ""abc"": "--%",
        "-0.004": "+0.00%",
        "-2.75": "-2.75%",
        "0": "+0.00%",
        "10.25": "+10.25%",
        "1234.56": "+1,234.56%",
        "5.25": "+5.25%",
        "NaN": "--%",
        "null": "--%",
        "undefined": "--%",
      }
    `);

    const formattedAtPrecision = table(
      [10.25, -0.06, -0.7, 0, 1234.56],
      (value) => formatPercentage(value, 1),
    );

    expect(formattedAtPrecision).toMatchInlineSnapshot(`
      {
        "-0.06": "-0.1%",
        "-0.7": "-0.7%",
        "0": "+0.0%",
        "10.25": "+10.3%",
        "1234.56": "+1,234.6%",
      }
    `);
  });

  it('formats funding rates', () => {
    const formatted = table(
      [0.0005, -0.0001, 0, 0.000000059, -0.000000059, ...MISSING_INPUTS],
      (value) => formatFundingRate(value as number),
    );

    expect(formatted).toMatchInlineSnapshot(`
      {
        """": "--%",
        ""abc"": "--%",
        "-0.0001": "-0.0100%",
        "-5.9e-8": "-<0.0001%",
        "0": "0.0000%",
        "0.0005": "0.0500%",
        "5.9e-8": "<0.0001%",
        "NaN": "--%",
        "null": "--%",
        "undefined": "--%",
      }
    `);
  });

  it('formats position sizes', () => {
    const formatted = table(
      [0.00048, 44, 0.0024, 1234.5, -0.004, ...MISSING_INPUTS],
      (value) => formatPositionSize(value as number),
    );

    expect(formatted).toMatchInlineSnapshot(`
      {
        """": "--",
        ""abc"": "--",
        "-0.004": "-0.004",
        "0.00048": "0.00048",
        "0.0024": "0.0024",
        "1234.5": "1234.5",
        "44": "44",
        "NaN": "--",
        "null": "--",
        "undefined": "--",
      }
    `);

    const formattedAtPrecision = table([0.00048, 44, -0.004], (value) =>
      formatPositionSize(value, 0),
    );

    expect(formattedAtPrecision).toMatchInlineSnapshot(`
      {
        "-0.004": "0",
        "0.00048": "0",
        "44": "44",
      }
    `);
  });

  it('formats fiat with the minimal and universal ranges', () => {
    const formatted = table(
      [1234.56, 1250, 0, 0.004, -0.004, 413.47, ...MISSING_INPUTS],
      (value) =>
        formatPerpsFiat(value as number, {
          ranges: PRICE_RANGES_MINIMAL_VIEW,
        }),
    );

    expect(formatted).toMatchInlineSnapshot(`
      {
        """": "$---",
        ""abc"": "$---",
        "-0.004": "-<$0.01",
        "0": "$0",
        "0.004": "<$0.01",
        "1234.56": "$1,234.56",
        "1250": "$1,250",
        "413.47": "$413.47",
        "NaN": "$---",
        "null": "$---",
        "undefined": "$---",
      }
    `);

    const formattedAtPrecision = table(
      [75231.4, 1234.56, 12.34567, 0.004236, -0.004],
      (value) => formatPerpsFiat(value, { ranges: PRICE_RANGES_UNIVERSAL }),
    );

    expect(formattedAtPrecision).toMatchInlineSnapshot(`
      {
        "-0.004": "-$0.004",
        "0.004236": "$0.004236",
        "12.34567": "$12.346",
        "1234.56": "$1,234.6",
        "75231.4": "$75,231",
      }
    `);
  });

  it('formats fee fiat (formatPositiveFiat replaced by formatPerpsFiat)', () => {
    const formatted = table([0, 0.005, 0.01, 1234.56], (value) =>
      formatPerpsFiat(value),
    );

    expect(formatted).toMatchInlineSnapshot(`
      {
        "0": "$0",
        "0.005": "<$0.01",
        "0.01": "$0.01",
        "1234.56": "$1,234.56",
      }
    `);
  });

  it('formats liquidation distance', () => {
    const formatted = table(
      [
        [100, 70],
        [75231, 50893],
        [100, 100],
        [100, undefined],
      ] as const,
      ([entry, liquidation]) => formatLiquidationDistance(entry, liquidation),
    );

    expect(formatted).toMatchInlineSnapshot(`
      {
        "[100,100]": "0.00%",
        "[100,70]": "30.00%",
        "[100,null]": undefined,
        "[75231,50893]": "32.35%",
      }
    `);
  });

  it('formats fee rates', () => {
    const formatted = table(
      [0.00045, 0.00143, 0, undefined, null, Number.NaN],
      (value) => formatFeeRate(value),
    );

    expect(formatted).toMatchInlineSnapshot(`
      {
        "0": "0.000%",
        "0.00045": "0.045%",
        "0.00143": "0.143%",
        "NaN": "--%",
        "null": "--%",
        "undefined": "--%",
      }
    `);
  });

  it('formats TWAP progress', () => {
    const formatted = table([0, 2500, 3333, 9999, 10000], (value) =>
      formatTwapProgressPercent(value),
    );

    expect(formatted).toMatchInlineSnapshot(`
      {
        "0": "0.00%",
        "10000": "100.00%",
        "2500": "25.00%",
        "3333": "33.33%",
        "9999": "99.99%",
      }
    `);
  });

  it('formats closed-trade PnL in history', () => {
    const formatted = table(
      [
        ['1234.5', '0'],
        ['-0.04', '0.01'],
        ['0.01', '0.01'],
        ['10', '0.004'],
      ] as const,
      ([pnl, fee]) =>
        transformFillsToTransactions([closeFill(pnl, fee)])[0]?.fill?.amount,
    );

    expect(formatted).toMatchInlineSnapshot(`
      {
        "["-0.04","0.01"]": "-$0.05",
        "["0.01","0.01"]": "$0.00",
        "["10","0.004"]": "+$10.00",
        "["1234.5","0"]": "+$1,234.50",
      }
    `);
  });

  it('formats for a German app language', () => {
    I18n.locale = 'de';

    const formatted = {
      pnl: formatPnl(1234.5),
      percentage: formatPercentage(-1234.56),
      roe: formatPercentage(10.25, 1),
      funding: formatFundingRate(0.0005),
      size: formatPositionSize(1234.5),
      fiat: formatPerpsFiat(1234.56, { ranges: PRICE_RANGES_MINIMAL_VIEW }),
      price: formatPerpsFiat(75231.4, { ranges: PRICE_RANGES_UNIVERSAL }),
      fee: formatFeeRate(0.00045),
      twap: formatTwapProgressPercent(3333),
    };

    expect(formatted).toMatchInlineSnapshot(`
      {
        "fee": "0,045%",
        "fiat": "1.234,56\u00a0$",
        "funding": "0,0500%",
        "percentage": "-1.234,56%",
        "pnl": "+1.234,50\u00a0$",
        "price": "75.231\u00a0$",
        "roe": "+10,3%",
        "size": "1234,5",
        "twap": "33,33%",
      }
    `);
  });
});
