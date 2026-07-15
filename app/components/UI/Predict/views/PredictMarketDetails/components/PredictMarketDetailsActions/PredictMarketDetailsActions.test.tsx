import React from 'react';
import { fireEvent, screen } from '@testing-library/react-native';
import type {
  ReactTestRendererJSON,
  ReactTestRendererNode,
} from 'react-test-renderer';
import renderWithProvider from '../../../../../../../util/test/renderWithProvider';
import {
  PredictMarket,
  PredictMarketStatus,
  PredictOutcome,
  Recurrence,
} from '../../../../types';
import { POLYMARKET_PROVIDER_ID } from '../../../../providers/polymarket/constants';
import { PredictMarketDetailsSelectorsIDs } from '../../../../Predict.testIds';
import PredictMarketDetailsActions from './PredictMarketDetailsActions';

const createOutcome = (overrides = {}): PredictOutcome => ({
  id: 'outcome-1',
  marketId: 'market-1',
  providerId: POLYMARKET_PROVIDER_ID,
  title: 'Outcome',
  description: 'Outcome description',
  image: 'https://example.com/outcome.png',
  status: 'open',
  volume: 1000,
  groupItemTitle: 'Winner',
  tokens: [
    { id: 'token-yes', title: 'Yes', price: 0.65 },
    { id: 'token-no', title: 'No', price: 0.35 },
  ],
  ...overrides,
});

const createMarket = (overrides = {}): PredictMarket => ({
  id: 'market-1',
  providerId: POLYMARKET_PROVIDER_ID,
  slug: 'market-1',
  title: 'Test market',
  description: 'Test market description',
  image: 'https://example.com/market.png',
  status: PredictMarketStatus.OPEN,
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: [],
  outcomes: [createOutcome()],
  liquidity: 1000,
  volume: 2000,
  ...overrides,
});

const createProps = (
  overrides: Partial<
    React.ComponentProps<typeof PredictMarketDetailsActions>
  > = {},
) => ({
  isClaimablePositionsLoading: false,
  hasPositivePnl: false,
  marketStatus: PredictMarketStatus.OPEN,
  singleOutcomeMarket: true,
  isMarketLoading: false,
  market: createMarket(),
  openOutcomes: [createOutcome()],
  onClaimPress: jest.fn(),
  onBuyPress: jest.fn(),
  isClaimPending: false,
  ...overrides,
});

const flattenStyle = (style: unknown): Record<string, unknown> => {
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map(flattenStyle));
  }

  if (style && typeof style === 'object') {
    return style as Record<string, unknown>;
  }

  return {};
};

type JsonTree = ReactTestRendererNode | ReactTestRendererNode[] | null;

const findJsonNodes = (
  node: JsonTree,
  predicate: (jsonNode: ReactTestRendererJSON) => boolean,
): ReactTestRendererJSON[] => {
  if (Array.isArray(node)) {
    return node.flatMap((child) => findJsonNodes(child, predicate));
  }

  if (!node || typeof node !== 'object') {
    return [];
  }

  const jsonNode = node as ReactTestRendererJSON;

  return [
    ...(predicate(jsonNode) ? [jsonNode] : []),
    ...findJsonNodes(jsonNode.children ?? [], predicate),
  ];
};

describe('PredictMarketDetailsActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders claim button when claimable pnl is available', () => {
    const onClaimPress = jest.fn();
    const props = createProps({
      hasPositivePnl: true,
      onClaimPress,
    });

    renderWithProvider(<PredictMarketDetailsActions {...props} />);

    const claimButton = screen.getByTestId(
      PredictMarketDetailsSelectorsIDs.CLAIM_WINNINGS_BUTTON,
    );
    expect(claimButton).toBeOnTheScreen();
  });

  it('labels buy buttons with the ask (buyPrice), not the mid, and handles presses', () => {
    const onBuyPress = jest.fn();
    // Wide spread: mid 0.65/0.35 but ask 0.71/0.41 -> buttons must show the ask.
    const openOutcome = createOutcome({
      tokens: [
        { id: 'token-yes', title: 'Yes', price: 0.65, buyPrice: 0.71 },
        { id: 'token-no', title: 'No', price: 0.35, buyPrice: 0.41 },
      ],
    });
    const props = createProps({
      hasPositivePnl: false,
      onBuyPress,
      openOutcomes: [openOutcome],
    });

    renderWithProvider(<PredictMarketDetailsActions {...props} />);

    fireEvent.press(screen.getByText('Yes • 71¢'));
    fireEvent.press(screen.getByText('No • 41¢'));
    // The mid must NOT be shown on the CTA.
    expect(screen.queryByText('Yes • 65¢')).toBeNull();

    expect(onBuyPress).toHaveBeenNthCalledWith(1, openOutcome.tokens[0]);
    expect(onBuyPress).toHaveBeenNthCalledWith(2, openOutcome.tokens[1]);
  });

  it('reserves button height in the action columns', () => {
    const props = createProps();

    const { toJSON } = renderWithProvider(
      <PredictMarketDetailsActions {...props} />,
    );

    const actionColumns = findJsonNodes(toJSON(), (node) => {
      const style = flattenStyle(node.props.style);
      return (
        node.props.accessibilityRole !== 'button' &&
        style.flexGrow === 1 &&
        style.minHeight === 48
      );
    });

    expect(actionColumns).toHaveLength(2);
  });

  it('falls back to market tokens when open outcomes are unavailable', () => {
    const onBuyPress = jest.fn();
    const fallbackMarket = createMarket();
    const props = createProps({
      market: fallbackMarket,
      openOutcomes: [],
      onBuyPress,
    });

    renderWithProvider(<PredictMarketDetailsActions {...props} />);

    fireEvent.press(screen.getByText(/•\s*65¢/));
    fireEvent.press(screen.getByText(/•\s*35¢/));

    expect(onBuyPress).toHaveBeenNthCalledWith(
      1,
      fallbackMarket.outcomes[0].tokens[0],
    );
    expect(onBuyPress).toHaveBeenNthCalledWith(
      2,
      fallbackMarket.outcomes[0].tokens[1],
    );
  });

  it('formats payout estimates with fixed USD decimals', () => {
    const props = createProps({
      showPayoutEstimate: true,
      openOutcomes: [
        createOutcome({
          tokens: [
            { id: 'token-yes', title: 'Yes', price: 0.65 },
            { id: 'token-no', title: 'No', price: 0.004 },
          ],
        }),
      ],
    });

    renderWithProvider(<PredictMarketDetailsActions {...props} />);

    expect(screen.getByText('$100.00 -> $153.85')).toBeOnTheScreen();
    expect(screen.getByText('$100.00 -> --')).toBeOnTheScreen();
  });

  it('hides payout estimates for prices outside the display range', () => {
    const props = createProps({
      showPayoutEstimate: true,
      openOutcomes: [
        createOutcome({
          tokens: [
            { id: 'token-yes', title: 'Yes', price: 1 },
            { id: 'token-no', title: 'No', price: 0.0012820513 },
          ],
        }),
      ],
    });

    renderWithProvider(<PredictMarketDetailsActions {...props} />);

    expect(screen.getAllByText('$100.00 -> --')).toHaveLength(2);
  });

  it('renders skeleton while market details are loading', () => {
    const props = createProps({
      isMarketLoading: true,
      market: null,
      marketStatus: PredictMarketStatus.CLOSED,
      singleOutcomeMarket: false,
    });

    renderWithProvider(<PredictMarketDetailsActions {...props} />);

    expect(
      screen.getByTestId('predict-details-buttons-skeleton-button-1'),
    ).toBeOnTheScreen();
  });

  it('renders nothing when no action state is active', () => {
    const props = createProps({
      marketStatus: PredictMarketStatus.CLOSED,
      singleOutcomeMarket: false,
      hasPositivePnl: false,
      isClaimablePositionsLoading: false,
      isMarketLoading: false,
    });

    renderWithProvider(<PredictMarketDetailsActions {...props} />);

    expect(
      screen.queryByTestId(
        PredictMarketDetailsSelectorsIDs.CLAIM_WINNINGS_BUTTON,
      ),
    ).not.toBeOnTheScreen();
    expect(
      screen.queryByTestId('predict-details-buttons-skeleton-button-1'),
    ).not.toBeOnTheScreen();
  });
});
