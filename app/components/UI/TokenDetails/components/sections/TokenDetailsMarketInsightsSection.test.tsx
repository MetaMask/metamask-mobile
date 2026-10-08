import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import Routes from '../../../../../constants/navigation/Routes';
import type { TokenDetailsRouteParams } from '../../constants/constants';
import {
  MARKET_INSIGHTS_MIN_TOKEN_AGE_DAYS,
  TOKEN_DETAILS_MARKET_INSIGHTS_SECTION_TEST_ID,
  isTokenUnderMinMarketInsightsAge,
  default as TokenDetailsMarketInsightsSection,
} from './TokenDetailsMarketInsightsSection';

const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockUseSelector = jest.mocked(useSelector);
const mockUseMarketInsights = jest.fn();
const mockEntryCard = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      addProperties: () => ({ build: () => ({}) }),
    }),
  }),
}));

jest.mock('../../../MarketInsights', () => ({
  selectMarketInsightsEnabled: jest.fn(),
  getMarketInsightsTraceId: () => 'trace-id',
  getMarketInsightsTraceTags: () => ({}),
  useMarketInsights: (...args: unknown[]) => mockUseMarketInsights(...args),
  useMarketInsightsEntryTrace: () => 'entry-trace-id',
  MarketInsightsEntryCard: (props: Record<string, unknown>) => {
    mockEntryCard(props);
    const { View, Text, Pressable } = jest.requireActual('react-native');
    return (
      <Pressable
        testID="market-insights-entry-card"
        onPress={props.onPress as () => void}
      >
        <Text>{'AI market insights'}</Text>
        <Text>{String(props.timeAgo)}</Text>
      </Pressable>
    );
  },
  MarketInsightsEntryCardSkeleton: () => {
    const { View } = jest.requireActual('react-native');
    return <View testID="market-insights-entry-card-skeleton" />;
  },
  MarketInsightsDisclaimerBottomSheet: () => {
    const { View } = jest.requireActual('react-native');
    return <View testID="market-insights-disclaimer-sheet" />;
  },
}));

jest.mock('../../../../../util/trace', () => ({
  trace: jest.fn(),
  TraceName: { MarketInsightsViewLoad: 'MarketInsightsViewLoad' },
  TraceOperation: { MarketInsightsLoad: 'MarketInsightsLoad' },
}));

// Controlled CAIP-19 resolution — the section falls back to this hook when
// no asset id is passed (legacy Token Details wiring).
jest.mock('../../hooks/useTokenCaipAssetId', () => ({
  useTokenCaipAssetId: () => 'eip155:1/erc20:0xabc',
}));

const token = {
  address: '0xabc',
  chainId: '0x1',
  symbol: 'PEPE',
  image: 'https://image.png',
} as unknown as TokenDetailsRouteParams;

const assetId = 'eip155:1/erc20:0xabc' as const;

const OLD_CREATED = new Date(
  Date.now() - 30 * 24 * 60 * 60 * 1000,
).toISOString();
const NEW_CREATED = new Date(
  Date.now() - 2 * 24 * 60 * 60 * 1000,
).toISOString();

const securityData = {
  created: OLD_CREATED,
} as unknown as TokenSecurityData;

const report = {
  asset: 'PEPE',
  digestId: 'digest-1',
  summary: 'Pepe is trending',
};

const mockInsightsLoading = () =>
  mockUseMarketInsights.mockReturnValue({
    report: null,
    reportAssetId: null,
    isLoading: true,
    error: null,
    timeAgo: '',
    cacheState: 'cold',
  });

const mockInsightsLoaded = () =>
  mockUseMarketInsights.mockReturnValue({
    report,
    reportAssetId: assetId,
    isLoading: false,
    error: null,
    timeAgo: '3m ago',
    cacheState: 'warm',
  });

const getCardCaip19Id = (): string | undefined =>
  (mockEntryCard.mock.calls.at(-1)?.[0] as { caip19Id?: string }).caip19Id;

describe('TokenDetailsMarketInsightsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSelector.mockReturnValue(true);
    mockInsightsLoaded();
  });

  it("renders today's entry card as is when the token is at least 7 days old (V1 wiring)", () => {
    const { getByTestId, getByText } = render(
      <TokenDetailsMarketInsightsSection
        token={token}
        assetId={assetId as never}
        securityData={securityData}
        minTokenAgeDays={MARKET_INSIGHTS_MIN_TOKEN_AGE_DAYS}
      />,
    );

    expect(
      getByTestId(TOKEN_DETAILS_MARKET_INSIGHTS_SECTION_TEST_ID),
    ).toBeTruthy();
    expect(getByTestId('market-insights-entry-card')).toBeTruthy();
    expect(getByText('3m ago')).toBeTruthy();
    // Digest lookup is keyed on the CAIP-19 asset id with insights enabled.
    expect(mockUseMarketInsights).toHaveBeenCalledWith(assetId, true, {
      source: 'token_details',
      stage: 'entry_card',
      assetType: 'token',
    });
  });

  it('resolves the asset id from the token when none is passed (legacy wiring)', () => {
    render(
      <TokenDetailsMarketInsightsSection
        token={token}
        securityData={securityData}
      />,
    );

    // Resolved from the token address + chain id via useTokenCaipAssetId.
    expect(mockUseMarketInsights).toHaveBeenCalledWith(assetId, true, {
      source: 'token_details',
      stage: 'entry_card',
      assetType: 'token',
    });
    expect(getCardCaip19Id()).toBe(assetId);
  });

  it('renders the skeleton while the report is loading', () => {
    mockInsightsLoading();

    const { getByTestId, queryByTestId } = render(
      <TokenDetailsMarketInsightsSection
        token={token}
        assetId={assetId as never}
        securityData={securityData}
        minTokenAgeDays={MARKET_INSIGHTS_MIN_TOKEN_AGE_DAYS}
      />,
    );

    expect(getByTestId('market-insights-entry-card-skeleton')).toBeTruthy();
    expect(queryByTestId('market-insights-entry-card')).toBeNull();
  });

  it('is hidden entirely for tokens under the minimum age — no skeleton (V1 wiring)', () => {
    mockInsightsLoading();

    const { queryByTestId } = render(
      <TokenDetailsMarketInsightsSection
        token={token}
        assetId={assetId as never}
        securityData={{ created: NEW_CREATED } as unknown as TokenSecurityData}
        minTokenAgeDays={MARKET_INSIGHTS_MIN_TOKEN_AGE_DAYS}
      />,
    );

    expect(
      queryByTestId(TOKEN_DETAILS_MARKET_INSIGHTS_SECTION_TEST_ID),
    ).toBeNull();
    expect(queryByTestId('market-insights-entry-card-skeleton')).toBeNull();
    // No digest request is made for a too-new token.
    expect(mockUseMarketInsights).toHaveBeenCalledWith(null, false, {
      source: 'token_details',
      stage: 'entry_card',
      assetType: 'token',
    });
  });

  it('shows the card regardless of token age when no minimum is passed (legacy wiring)', () => {
    mockInsightsLoaded();

    const { getByTestId } = render(
      <TokenDetailsMarketInsightsSection
        token={token}
        assetId={assetId as never}
        securityData={{ created: NEW_CREATED } as unknown as TokenSecurityData}
      />,
    );

    expect(getByTestId('market-insights-entry-card')).toBeTruthy();
    expect(mockUseMarketInsights).toHaveBeenCalledWith(assetId, true, {
      source: 'token_details',
      stage: 'entry_card',
      assetType: 'token',
    });
  });

  it('stays visible when the token age is unknown', () => {
    const { getByTestId } = render(
      <TokenDetailsMarketInsightsSection
        token={token}
        assetId={assetId as never}
        securityData={null}
        minTokenAgeDays={MARKET_INSIGHTS_MIN_TOKEN_AGE_DAYS}
      />,
    );

    expect(getByTestId('market-insights-entry-card')).toBeTruthy();
  });

  it('opens the full insights view on card press', () => {
    const { getByTestId } = render(
      <TokenDetailsMarketInsightsSection
        token={token}
        assetId={assetId as never}
        securityData={securityData}
        pricePercentChange={3.09}
        minTokenAgeDays={MARKET_INSIGHTS_MIN_TOKEN_AGE_DAYS}
      />,
    );

    fireEvent.press(getByTestId('market-insights-entry-card'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MARKET_INSIGHTS.VIEW, {
      assetSymbol: 'PEPE',
      assetIdentifier: assetId,
      tokenImageUrl: 'https://image.png',
      pricePercentChange: 3.09,
      token,
      source: 'token_details',
      useAmbientColor: undefined,
    });
  });

  it('forwards the ambient color flag to the full insights view (legacy wiring)', () => {
    const { getByTestId } = render(
      <TokenDetailsMarketInsightsSection
        token={token}
        assetId={assetId as never}
        securityData={securityData}
        useAmbientColor
      />,
    );

    fireEvent.press(getByTestId('market-insights-entry-card'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.MARKET_INSIGHTS.VIEW, {
      assetSymbol: 'PEPE',
      assetIdentifier: assetId,
      tokenImageUrl: 'https://image.png',
      pricePercentChange: 0,
      token,
      source: 'token_details',
      useAmbientColor: true,
    });
  });

  it('reports the display state through the callback once resolved (legacy wiring)', () => {
    const onDisplayResolved = jest.fn();

    render(
      <TokenDetailsMarketInsightsSection
        token={token}
        assetId={assetId as never}
        securityData={
          {
            created: OLD_CREATED,
            resultType: 'Warning',
          } as unknown as TokenSecurityData
        }
        onDisplayResolved={onDisplayResolved}
      />,
    );

    expect(onDisplayResolved).toHaveBeenCalledWith({
      isDisplayed: true,
      severity: 'Warning',
    });
  });

  it('reports a hidden card when the feature flag is off', () => {
    mockUseSelector.mockReturnValue(false);
    const onDisplayResolved = jest.fn();

    render(
      <TokenDetailsMarketInsightsSection
        token={token}
        assetId={assetId as never}
        securityData={securityData}
        onDisplayResolved={onDisplayResolved}
      />,
    );

    expect(onDisplayResolved).toHaveBeenCalledWith({
      isDisplayed: false,
      severity: undefined,
    });
  });

  it('is hidden when the market insights feature flag is off', () => {
    mockUseSelector.mockReturnValue(false);

    const { queryByTestId } = render(
      <TokenDetailsMarketInsightsSection
        token={token}
        assetId={assetId as never}
        securityData={securityData}
        minTokenAgeDays={MARKET_INSIGHTS_MIN_TOKEN_AGE_DAYS}
      />,
    );

    expect(
      queryByTestId(TOKEN_DETAILS_MARKET_INSIGHTS_SECTION_TEST_ID),
    ).toBeNull();
  });

  it('opens the disclaimer sheet from the card', () => {
    const { getByTestId, queryByTestId } = render(
      <TokenDetailsMarketInsightsSection
        token={token}
        assetId={assetId as never}
        securityData={securityData}
      />,
    );

    expect(queryByTestId('market-insights-disclaimer-sheet')).toBeNull();

    // The disclaimer opens through the entry card's own press handler.
    const entryCardProps = mockEntryCard.mock.calls.at(-1)?.[0] as {
      onDisclaimerPress: () => void;
    };
    act(() => {
      entryCardProps.onDisclaimerPress();
    });

    expect(getByTestId('market-insights-disclaimer-sheet')).toBeTruthy();
  });
});

describe('isTokenUnderMinMarketInsightsAge', () => {
  it.each([
    ['2 days old', NEW_CREATED, true],
    ['30 days old', OLD_CREATED, false],
    ['missing date', undefined, false],
    ['unparsable date', 'not-a-date', false],
  ])('%s → %s', (_label, created, expected) => {
    expect(
      isTokenUnderMinMarketInsightsAge(
        created,
        MARKET_INSIGHTS_MIN_TOKEN_AGE_DAYS,
      ),
    ).toBe(expected);
  });
});
