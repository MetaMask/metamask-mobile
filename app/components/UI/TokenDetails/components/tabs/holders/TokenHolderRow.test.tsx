import { screen } from '@testing-library/react-native';
import React from 'react';
import renderWithProvider from '../../../../../../util/test/renderWithProvider';
import type { TraderFeedRow } from '../../../../SocialFeed/types';
import { mapFeedItem } from '../../../../SocialFeed/utils/mapFeedItem';
import { TOKEN_HOLDERS_FIXTURE } from './tokenHolders.fixture';
import TokenHolderRow, { TokenHolderRowSelectorsIDs } from './TokenHolderRow';

/**
 * A fixture holder, with room to override either half of the row: `core` is
 * the raw API position the numbers come from, `item` the mapped presentation
 * the row reads its flags off.
 */
const toRow = (
  index: number,
  overrides: {
    core?: Partial<TraderFeedRow['core']>;
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

  it('prices the holding in dollars, as the API reports it', () => {
    const row = toRow(0, { core: { currentValueUSD: 2_400_000 } });

    renderWithProvider(<TokenHolderRow row={row} />);

    expect(
      screen.getByTestId(TokenHolderRowSelectorsIDs.POSITION_VALUE),
    ).toHaveTextContent('$2.4M');
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
