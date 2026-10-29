import { fireEvent, screen } from '@testing-library/react-native';
import type { CaipAssetType } from '@metamask/utils';
import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import { selectSocialLeaderboardEnabled } from '../../../../../selectors/featureFlagController/socialLeaderboard';
import type { TraderFeedRow } from '../../../SocialFeed/types';
import { mapFeedItem } from '../../../SocialFeed/utils/mapFeedItem';
import TokenDetailsHoldersTab, {
  TokenDetailsHoldersTabSelectorsIDs,
} from './HoldersTab';
import { TOKEN_HOLDERS_FIXTURE } from './holders/tokenHolders.fixture';
import { TokenHolderRowSelectorsIDs } from './holders/TokenHolderRow';
import {
  useTokenHolders,
  type TokenHoldersState,
} from './holders/useTokenHolders';

jest.mock(
  '../../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardEnabled: jest.fn(() => true),
  }),
);

jest.mock('./holders/useTokenHolders', () => ({
  useTokenHolders: jest.fn(),
}));

// Paging follows the page's ScrollView, which a test renderer never scrolls.
// Capture the hook's options so the tab's wiring is what is asserted, and so
// a test can fire the callback the way a scroll would.
const mockLoadMoreOptions = jest.fn();
jest.mock('../tokenDetailsScroll', () => ({
  useLoadMoreOnScroll: (options: {
    enabled: boolean;
    onLoadMore: () => void;
  }) => {
    mockLoadMoreOptions(options);
  },
}));

const mockUseTokenHolders = jest.mocked(useTokenHolders);
const mockSelectEnabled = jest.mocked(selectSocialLeaderboardEnabled);

const assetId =
  'eip155:1/erc20:0x6982508145454ce325ddbe47a25d4ec3d2311933' as CaipAssetType;

const toRow = (index: number): TraderFeedRow => {
  const core = TOKEN_HOLDERS_FIXTURE.items[index];
  const item = mapFeedItem(core);
  if (!item) {
    throw new Error(`fixture row ${index} did not map`);
  }
  return { item, core };
};

const baseState: TokenHoldersState = {
  rows: [],
  isLoading: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  loadMore: jest.fn(),
  error: null,
  refresh: jest.fn(),
};

const mockState = (overrides: Partial<TokenHoldersState> = {}) => {
  const state = { ...baseState, ...overrides };
  mockUseTokenHolders.mockReturnValue(state);
  return state;
};

const renderTab = ({ isActive = true }: { isActive?: boolean } = {}) =>
  renderWithProvider(
    <TokenDetailsHoldersTab assetId={assetId} isActive={isActive} />,
    {},
  );

type StyleEntry = { color?: string } | null | undefined;

/** Resolved text color: the design system turns its color tokens into styles. */
const textColor = (node: {
  props: { style?: unknown };
}): string | undefined => {
  const style = node.props.style as StyleEntry | StyleEntry[];
  const entries = Array.isArray(style) ? style : [style];
  return entries.find((entry) => entry?.color)?.color;
};

describe('TokenDetailsHoldersTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectEnabled.mockReturnValue(true);
    mockState();
  });

  it('asks for the holders of the token on screen', () => {
    renderTab();

    expect(mockUseTokenHolders).toHaveBeenCalledWith({
      assetId,
      enabled: true,
    });
  });

  it('disables the query while the social flag is off', () => {
    mockSelectEnabled.mockReturnValue(false);

    renderTab();

    expect(mockUseTokenHolders).toHaveBeenCalledWith({
      assetId,
      enabled: false,
    });
  });

  it('renders a row per holder', () => {
    mockState({ rows: [toRow(0), toRow(1), toRow(2)] });

    renderTab();

    expect(
      screen.getByTestId(TokenDetailsHoldersTabSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getAllByTestId(TokenHolderRowSelectorsIDs.CONTAINER),
    ).toHaveLength(3);
    expect(screen.getByText('frogwhale.eth')).toBeOnTheScreen();
    expect(screen.getByText('degenmachine')).toBeOnTheScreen();
  });

  it('keeps the position value uncolored and colors only the P&L percent', () => {
    // Row 0 is up, row 1 is down.
    mockState({ rows: [toRow(0), toRow(1)] });

    renderTab();

    const values = screen.getAllByTestId(
      TokenHolderRowSelectorsIDs.POSITION_VALUE,
    );
    const percents = screen.getAllByTestId(
      TokenHolderRowSelectorsIDs.PNL_PERCENT,
    );
    const defaultColor = textColor(
      screen.getAllByTestId(TokenHolderRowSelectorsIDs.NAME)[0],
    );

    // A holding, not a result: no +/- sign, and the same color as the name.
    expect(values[0]).toHaveTextContent('$2.4M');
    expect(values[1]).toHaveTextContent('$884.2K');
    values.forEach((value) => {
      expect(value.props.children).not.toMatch(/^[+-]/u);
      expect(textColor(value)).toBe(defaultColor);
    });

    expect(percents[0]).toHaveTextContent('+212.48%');
    expect(percents[1]).toHaveTextContent('-18.03%');
    expect(textColor(percents[0])).not.toBe(defaultColor);
    expect(textColor(percents[1])).not.toBe(defaultColor);
    expect(textColor(percents[0])).not.toBe(textColor(percents[1]));
  });

  it('renders the numbers unmarked, fixture-backed or not', () => {
    mockState({ rows: [toRow(0)] });

    renderTab();

    expect(
      screen.getByTestId(TokenHolderRowSelectorsIDs.POSITION_VALUE),
    ).toHaveTextContent('$2.4M');
    expect(
      screen.getByTestId(TokenHolderRowSelectorsIDs.PNL_PERCENT),
    ).toHaveTextContent('+212.48%');
    expect(
      screen.getByTestId(TokenHolderRowSelectorsIDs.POSITION_VALUE),
    ).not.toHaveTextContent('*');
    expect(
      screen.getByTestId(TokenHolderRowSelectorsIDs.PNL_PERCENT),
    ).not.toHaveTextContent('*');
  });

  it('shows the skeleton while the first page loads', () => {
    mockState({ isLoading: true });

    renderTab();

    expect(
      screen.queryByTestId(TokenDetailsHoldersTabSelectorsIDs.EMPTY),
    ).toBeNull();
    expect(
      screen.queryByTestId(TokenHolderRowSelectorsIDs.CONTAINER),
    ).toBeNull();
  });

  it('shows the empty state once an empty page has loaded', () => {
    mockState();

    renderTab();

    expect(
      screen.getByTestId(TokenDetailsHoldersTabSelectorsIDs.EMPTY),
    ).toBeOnTheScreen();
    expect(screen.getByText('No holders to show yet')).toBeOnTheScreen();
  });

  it('shows the error state and retries from its button', () => {
    const state = mockState({ error: 'Request failed' });

    renderTab();

    expect(
      screen.getByTestId(TokenDetailsHoldersTabSelectorsIDs.ERROR),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(TokenDetailsHoldersTabSelectorsIDs.EMPTY),
    ).toBeNull();

    fireEvent.press(
      screen.getByTestId(TokenDetailsHoldersTabSelectorsIDs.RETRY),
    );

    expect(state.refresh).toHaveBeenCalled();
  });

  it('asks for the next page when the page scrolls near its end', () => {
    const state = mockState({ rows: [toRow(0)], hasNextPage: true });

    renderTab();

    expect(mockLoadMoreOptions).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: true }),
    );

    const { onLoadMore } = mockLoadMoreOptions.mock.calls.at(-1)[0];
    onLoadMore();

    expect(state.loadMore).toHaveBeenCalled();
  });

  it('stops following the scroll and shows a spinner while the next page is in flight', () => {
    mockState({
      rows: [toRow(0)],
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    renderTab();

    expect(
      screen.getByTestId(TokenDetailsHoldersTabSelectorsIDs.NEXT_PAGE),
    ).toBeOnTheScreen();
    expect(mockLoadMoreOptions).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });

  it('does not page itself in while it is the hidden tab', () => {
    mockState({ rows: [toRow(0)], hasNextPage: true });

    renderTab({ isActive: false });

    expect(mockLoadMoreOptions).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
  });
});
