import { screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import type { TraderFeedRow } from '../../../../SocialFeed/types';
import { mapFeedItem } from '../../../../SocialFeed/utils/mapFeedItem';
import { TOKEN_HOLDERS_FIXTURE } from './tokenHolders.fixture';
import TokenHolderRow from './TokenHolderRow';
import { TokenDetailsIds } from '../../../testIds';

const TokenHolderRowSelectorsIDs = TokenDetailsIds.holderRow;

/**
 * A fixture holder, with room to override either half of the row: `core` is
 * the raw API position the numbers come from, `item` the mapped presentation
 * the row reads its flags off.
 */
const toRow = (
  index: number,
  overrides: {
    // `positionValueUSD` is not on the core type yet; the row reads it optionally.
    core?: Partial<TraderFeedRow['core'] & { positionValueUSD?: number }>;
    item?: Partial<TraderFeedRow['item']>;
  } = {},
): TraderFeedRow => {
  const core = { ...TOKEN_HOLDERS_FIXTURE.items[index], ...overrides.core };
  const item = mapFeedItem(core);
  if (!item) {
    throw new Error(`fixture row ${index} did not map`);
  }
  // `Object.assign` onto the mapped item rather than a spread: the item is a
  // discriminated union, and spreading it widens the result out of that union.
  // The item is freshly built per call, so mutating it affects nobody.
  return { core, item: Object.assign(item, overrides.item) };
};

const textColorOf = (testID: string) => {
  const styles = screen.getByTestId(testID).props.style;
  return (Array.isArray(styles) ? Object.assign({}, ...styles) : styles)?.color;
};

describe('TokenHolderRow', () => {
  it('shows who the holder is', () => {
    const row = toRow(0);

    renderWithProvider(<TokenHolderRow row={row} />);

    expect(
      screen.getByTestId(TokenHolderRowSelectorsIDs.NAME),
    ).toHaveTextContent(row.item.username);
    expect(
      screen.getByTestId(TokenHolderRowSelectorsIDs.FOLLOWERS),
    ).toBeOnTheScreen();
  });

  it('abbreviates the position value so a whale keeps the column one line', () => {
    const row = toRow(0, { core: { currentValueUSD: 2_400_000 } });

    renderWithProvider(<TokenHolderRow row={row} />);

    expect(
      screen.getByTestId(TokenHolderRowSelectorsIDs.POSITION_VALUE),
    ).toHaveTextContent('$2.4M');
  });

  it('shows positionValueUSD, the value the list is ranked by, over currentValueUSD', () => {
    const row = toRow(0, {
      core: { currentValueUSD: 2_400_000, positionValueUSD: 3_100_000 },
    });

    renderWithProvider(<TokenHolderRow row={row} />);

    expect(
      screen.getByTestId(TokenHolderRowSelectorsIDs.POSITION_VALUE),
    ).toHaveTextContent('$3.1M');
  });

  it('falls back to currentValueUSD when the API omits positionValueUSD', () => {
    const row = toRow(0, {
      core: { currentValueUSD: 2_400_000, positionValueUSD: undefined },
    });

    renderWithProvider(<TokenHolderRow row={row} />);

    expect(
      screen.getByTestId(TokenHolderRowSelectorsIDs.POSITION_VALUE),
    ).toHaveTextContent('$2.4M');
  });

  describe('perps holder', () => {
    const PERP_CORE = {
      chain: 'hyperliquid',
      tokenSymbol: 'BTC',
      tokenAddress: 'BTC',
      perpPositionType: 'long',
      currentValueUSD: 50_000,
      positionValueUSD: 500_000,
      pnlPercent: 25,
    } as const;

    it('shows the leveraged size and the P&L in dollars', () => {
      const row = toRow(0, { core: { ...PERP_CORE, pnlValueUsd: 12_300 } });

      renderWithProvider(<TokenHolderRow row={row} />);

      expect(
        screen.getByTestId(TokenHolderRowSelectorsIDs.POSITION_VALUE),
      ).toHaveTextContent('$500K');
      expect(
        screen.getByTestId(TokenHolderRowSelectorsIDs.PNL_VALUE),
      ).toHaveTextContent('+$12.3K');
      expect(
        screen.queryByTestId(TokenHolderRowSelectorsIDs.PNL_PERCENT),
      ).toBeNull();
    });

    it('colors the dollar P&L by direction while the size stays default', () => {
      const gain = toRow(0, { core: { ...PERP_CORE, pnlValueUsd: 12_300 } });
      const { unmount } = renderWithProvider(<TokenHolderRow row={gain} />);
      const gainColor = textColorOf(TokenHolderRowSelectorsIDs.PNL_VALUE);
      const sizeColor = textColorOf(TokenHolderRowSelectorsIDs.POSITION_VALUE);
      unmount();

      const loss = toRow(0, { core: { ...PERP_CORE, pnlValueUsd: -4_000 } });
      renderWithProvider(<TokenHolderRow row={loss} />);

      expect(
        screen.getByTestId(TokenHolderRowSelectorsIDs.PNL_VALUE),
      ).toHaveTextContent('-$4K');
      expect(textColorOf(TokenHolderRowSelectorsIDs.PNL_VALUE)).not.toBe(
        gainColor,
      );
      expect(sizeColor).not.toBe(gainColor);
    });

    it('falls back to the P&L percent when the dollar P&L is missing', () => {
      const row = toRow(0, {
        core: { ...PERP_CORE, pnlValueUsd: undefined },
      });

      renderWithProvider(<TokenHolderRow row={row} />);

      expect(
        screen.getByTestId(TokenHolderRowSelectorsIDs.PNL_PERCENT),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(TokenHolderRowSelectorsIDs.PNL_VALUE),
      ).toBeNull();
    });
  });

  it('renders the position value unsigned: a holding is not a result', () => {
    const row = toRow(0, { core: { currentValueUSD: 12_345 } });

    renderWithProvider(<TokenHolderRow row={row} />);

    const value = screen.getByTestId(TokenHolderRowSelectorsIDs.POSITION_VALUE);
    expect(value).not.toHaveTextContent('+');
    expect(value).not.toHaveTextContent('-');
  });

  it('colors the P&L percent by direction while the value stays default', () => {
    const gain = toRow(0, {
      core: { pnlPercent: 212.48 },
      item: { isPnlPositive: true },
    });

    const { unmount } = renderWithProvider(<TokenHolderRow row={gain} />);
    const gainColor = textColorOf(TokenHolderRowSelectorsIDs.PNL_PERCENT);
    const valueColor = textColorOf(TokenHolderRowSelectorsIDs.POSITION_VALUE);
    unmount();

    const loss = toRow(0, {
      core: { pnlPercent: -18.03 },
      item: { isPnlPositive: false },
    });
    renderWithProvider(<TokenHolderRow row={loss} />);
    const lossColor = textColorOf(TokenHolderRowSelectorsIDs.PNL_PERCENT);

    expect(gainColor).not.toBe(lossColor);
    expect(valueColor).not.toBe(gainColor);
  });

  it('omits the value when the position carries none', () => {
    const row = toRow(0, { item: { hasValueData: false } });

    renderWithProvider(<TokenHolderRow row={row} />);

    expect(
      screen.queryByTestId(TokenHolderRowSelectorsIDs.POSITION_VALUE),
    ).toBeNull();
    expect(
      screen.getByTestId(TokenHolderRowSelectorsIDs.PNL_PERCENT),
    ).toBeOnTheScreen();
  });

  it('omits the percent when the position carries no P&L', () => {
    const row = toRow(0, { item: { hasPnlData: false } });

    renderWithProvider(<TokenHolderRow row={row} />);

    expect(
      screen.queryByTestId(TokenHolderRowSelectorsIDs.PNL_PERCENT),
    ).toBeNull();
    expect(
      screen.getByTestId(TokenHolderRowSelectorsIDs.POSITION_VALUE),
    ).toBeOnTheScreen();
  });

  it('renders the row with neither number rather than crashing', () => {
    const row = toRow(0, {
      item: { hasValueData: false, hasPnlData: false },
    });

    renderWithProvider(<TokenHolderRow row={row} />);

    expect(
      screen.getByTestId(TokenHolderRowSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
  });
});
