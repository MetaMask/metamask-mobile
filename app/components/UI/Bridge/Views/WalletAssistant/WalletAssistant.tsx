import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { fetch as expoFetch } from 'expo/fetch';
import * as Keychain from 'react-native-keychain'; // eslint-disable-line import-x/no-namespace
import {
  BatchSellMetricsLocation,
  MetaMetricsSwapsEventSource,
} from '@metamask/bridge-controller';
import {
  fetchTokenAssets,
  getTrendingTokens,
  type TrendingAsset,
} from '@metamask/assets-controllers';
import type { CaipAssetType, CaipChainId } from '@metamask/utils';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  BottomSheet,
  BottomSheetFooter,
  BottomSheetHeader,
  type BottomSheetRef,
  ButtonsAlignment,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonIconVariant,
  ButtonSize,
  ButtonVariant,
  HeaderStandard,
  Icon,
  IconColor,
  IconName,
  IconSize,
  FontWeight,
  Text,
  TextColor,
  TextField,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import { useReduceMotion } from '../../../../UI/Money/hooks/useReduceMotion';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import { BridgeToken, BridgeViewMode } from '../../types';
import SourceLogoGroup from '../../../MarketInsights/components/SourceLogoGroup';
import ArticleRow from '../../../MarketInsights/components/ArticleRow';
import { isSafeUrl } from '../../../MarketInsights/utils/marketInsightsFormatting';
import { useTokensFeed } from '../../../../Views/TrendingView/feeds/tokens/useTokensFeed';
import { usePopularTokens } from '../../../../Views/Homepage/Sections/Tokens/hooks/usePopularTokens';
import TrendingTokenLogo from '../../../Trending/components/TrendingTokenLogo';
import { getAssetNavigationParams } from '../../../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import { useTrendingTokenPress } from '../../../Trending/hooks/useTrendingTokenPress/useTrendingTokenPress';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import { formatPriceWithSubscriptNotation } from '../../../Predict/utils/format';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import {
  selectAllowedChainRanking,
  selectBatchSellDestStablecoinsByChain,
  selectSelectedSourceChainIds,
  setBatchSellSourceTokens,
} from '../../../../../core/redux/slices/bridge';
import { useBalancesByAssetId } from '../../hooks/useBalancesByAssetId';
import { selectBridgeHistoryForAccount } from '../../../../../selectors/bridgeStatusController';
import AssistantResponseActions from './components/AssistantResponseActions';
import AgentProgress, { AgentProgressStatus } from './components/AgentProgress';
import { ConversationControlsTestIds } from './components/ConversationControls/ConversationControls.testIds';
import EmbeddedSwapCard from './components/EmbeddedSwapCard';
import PortfolioPlanCard from './components/PortfolioPlanCard';
import ResearchChart from './components/ResearchChart';
import { WalletAssistantTransactionStatusCard } from './components/TransactionStatusCard';
import {
  buildSecureOpenAIRequestParts,
  classifyOpenAIError,
  MalformedOpenAIResponseError,
  type OpenAIErrorRecovery,
  parseWalletAssistantResearchResponse,
  streamOpenAIResponse,
  type WalletAssistantResearchAsset,
  type WalletAssistantResearchResponse,
  type WalletAssistantResearchSource,
} from './openai';
import {
  buildImmediateTradeResponse,
  getResearchNetworkContext,
  prioritizeDirectTradeRequest,
} from './tradeIntentPriority';
import {
  getNetworkContextInstructions,
  hasNetworkContextMismatch,
  ROBINHOOD_CHAIN_RETRY_INSTRUCTIONS,
} from './networkContext';
import {
  applyResearchPlanIdentity,
  buildLocalMarketListResponse,
  buildLocalPriceResponse,
  buildResearchPlan,
  getInitialResearchDomains,
  getResearchPlanInstructions,
  isLocalMemeMarketListRequest,
  shouldBroadenInitialResearch,
} from './researchRouting';
import {
  getConversationMessageEntries,
  getUniqueTokenSymbols,
} from './performanceUtils';
import { useWalletAssistantPersistence } from './persistence';
import { WalletAssistantWalletContext } from './walletContext';
import {
  buildPortfolioPlan,
  getTokenLabelsByAssetId,
  getWalletTokenAssetId,
  parsePortfolioPlanRequest,
  type WalletAssistantPortfolioPlan,
} from './portfolioPlan';
import {
  getTokenPillMovement,
  TOKEN_PILL_MOVEMENT_PRESENTATION,
  type TokenPillMovement,
} from './tokenPillMovement';

type ResearchSource = WalletAssistantResearchSource;
type ResearchResponse = WalletAssistantResearchResponse;

interface Message {
  id: string;
  portfolioPlan?: WalletAssistantPortfolioPlan;
  role: 'assistant' | 'user';
  research?: ResearchResponse;
  text: string;
}

const INITIAL_MESSAGES: Message[] = [];
const OPENAI_KEYCHAIN_SERVICE = 'metamask-wallet-assistant-openai-v2';
const PROMPT_EXAMPLES = [
  {
    icon: IconName.Merge,
    label: 'Consolidate positions',
    prompt: 'Move all my meme coins into USDC',
  },
  {
    icon: IconName.SwapVertical,
    label: 'Buy or swap a token',
    prompt: 'Swap 0.1 ETH for USDC',
  },
  {
    icon: IconName.Search,
    label: 'Research a token',
    prompt: 'Research a token in my wallet',
  },
  {
    icon: IconName.SecuritySearch,
    label: 'Explain token risk',
    prompt: 'Explain the risk of a token in my wallet',
  },
] as const;
const FIRST_CHAT_LAYOUT_ANIMATION = {
  duration: 460,
  create: {
    duration: 460,
    property: LayoutAnimation.Properties.opacity,
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  update: {
    duration: 340,
    type: LayoutAnimation.Types.easeInEaseOut,
  },
  delete: {
    duration: 220,
    property: LayoutAnimation.Properties.opacity,
    type: LayoutAnimation.Types.easeInEaseOut,
  },
};
const BASE_OPENAI_INSTRUCTIONS =
  'You are Wallet Assistant inside MetaMask. Trading assistance is your primary job. Be concise, useful, and transparent about uncertainty. Treat direct language such as “Can I buy ETH?”, “Buy ETH”, “I want to sell ETH”, or “Swap ETH for USDC” as a request to prepare a trade, not as a request for educational information. For those requests, set swapIntent.enabled true, keep the prose task-focused, and do not use web research unless the user separately asks for market research. Questions such as “Should I buy ETH?” remain research or financial-education questions and must not prepare a trade. Research current market questions using web search. For single-token identity and overview questions, use CoinMarketCap as the first source. Corroborate with CoinGecko, official project documentation, chain explorers, and other reputable sources when useful. Never ask the user to choose a tracker, data source, or research provider when the question can be answered with web research. Return a short factual headline in title and clean structured content: no Markdown, no inline URLs, and no URLs in title, summary, or bullets. Give every source a stable unique ID. Put only safe, public URLs in the sources array with their publication date as an ISO-8601 string, or an empty date when unavailable. Add source IDs and a confidence level to every factual bullet. Set asOf to the timestamp or date represented by the research. Never name a source “live price feed” or describe a web result as live or real-time. Treat researched prices as time-stamped snapshots, not current app prices. For token price questions, let the app’s verified token pill display the current price and focus the prose on context and drivers. Include a chart only when researched sources provide a small, directly comparable numeric series. Include one source ID for each chart point. Otherwise return an empty chart. Never estimate or invent chart values. Put the uppercase ticker symbols of clearly identified crypto tokens discussed in the response in the tokens array. Put network-aware identity in assets, including contract address and CAIP chain ID when verified; leave unknown fields empty and never infer identity from ticker alone. Exclude companies, funds, ambiguous tickers, and assets you cannot identify confidently. When the user explicitly asks to buy, sell, swap, or trade a token, set swapIntent.enabled true and identify the source and destination ticker when stated. Wallet Assistant only prepares real MetaMask swaps; if the user explicitly requests a paper, fake, simulated, or simulation trade, explain briefly that simulations are not supported and set swapIntent.enabled false. Set swapIntent.mode to real. Classify the requested amount as exact source-token amount, fiat amount, percentage of a source holding, or unspecified; put the raw number in amountValue. Copy amountValue into sourceAmount only for exact source-token amounts. Capture an explicitly named network in network, otherwise leave it empty. For requests such as “buy $50 of ETH” with no source token, leave sourceSymbol and sourceAmount empty, set amountType fiat, and amountValue 50. Otherwise set swapIntent.enabled false and leave its strings empty with amountType unspecified and mode real. Never claim a quote is ready, predict received amount or fees, sign, submit, or say a transaction completed. The app resolves verified assets and MetaMask Swap fetches the real quote; the user must review and explicitly confirm every transaction. Do not provide personalized financial advice.';
const STRUCTURED_RESPONSE_RETRY_INSTRUCTIONS =
  'Your previous answer could not be decoded. Return one complete JSON object that exactly matches the provided wallet_research schema. Do not use Markdown fences, commentary, or text outside the JSON object.';
const BROAD_RESEARCH_RETRY_INSTRUCTIONS =
  'CoinMarketCap did not provide a usable result for this token. Broaden the search to CoinGecko, official project documentation, and chain explorers. Do not substitute a different token with the same or a similar ticker.';
const RESEARCH_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    asOf: { type: 'string' },
    assets: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          chainId: { type: 'string' },
          contractAddress: { type: 'string' },
          name: { type: 'string' },
          network: { type: 'string' },
          symbol: { type: 'string' },
        },
        required: ['chainId', 'contractAddress', 'name', 'network', 'symbol'],
      },
    },
    title: { type: 'string' },
    summary: { type: 'string' },
    sections: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          heading: { type: 'string' },
          bullets: { type: 'array', items: { type: 'string' } },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                confidence: {
                  type: 'string',
                  enum: ['high', 'medium', 'low'],
                },
                sourceIds: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
              required: ['confidence', 'sourceIds'],
            },
          },
        },
        required: ['heading', 'bullets', 'evidence'],
      },
    },
    sources: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          date: { type: 'string' },
          id: { type: 'string' },
          title: { type: 'string' },
          url: { type: 'string' },
        },
        required: ['date', 'id', 'title', 'url'],
      },
    },
    chart: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        unit: { type: 'string' },
        labels: { type: 'array', items: { type: 'string' } },
        sourceIds: { type: 'array', items: { type: 'string' } },
        values: { type: 'array', items: { type: 'number' } },
      },
      required: ['title', 'unit', 'labels', 'sourceIds', 'values'],
    },
    tokens: {
      type: 'array',
      items: { type: 'string' },
    },
    swapIntent: {
      type: 'object',
      additionalProperties: false,
      properties: {
        amountType: {
          type: 'string',
          enum: ['exact', 'fiat', 'percent', 'unspecified'],
        },
        amountValue: { type: 'string' },
        enabled: { type: 'boolean' },
        mode: { type: 'string', enum: ['real'] },
        network: { type: 'string' },
        sourceAmount: { type: 'string' },
        sourceSymbol: { type: 'string' },
        destinationSymbol: { type: 'string' },
      },
      required: [
        'amountType',
        'amountValue',
        'enabled',
        'mode',
        'network',
        'sourceAmount',
        'sourceSymbol',
        'destinationSymbol',
      ],
    },
  },
  required: [
    'asOf',
    'assets',
    'title',
    'summary',
    'sections',
    'sources',
    'chart',
    'tokens',
    'swapIntent',
  ],
};

interface OpenAIResponse {
  error?: {
    message?: string;
  };
  output?: {
    content?: {
      text?: string;
      type?: string;
    }[];
    type?: string;
  }[];
  output_text?: string;
}

const getResponseText = (response: OpenAIResponse) => {
  if (response.output_text) {
    return response.output_text;
  }

  return (
    response.output
      ?.filter((item) => item.type === 'message')
      .flatMap((item) => item.content ?? [])
      .filter((content) => content.type === 'output_text')
      .map((content) => content.text)
      .filter(Boolean)
      .join('\n') ?? ''
  );
};

const stripMarkdownLinks = (text: string) =>
  text.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1');

const getSourceLabel = (source: ResearchSource) => {
  try {
    return new URL(source.url).hostname.replace(/^www\./, '');
  } catch {
    return source.title;
  }
};

const getResearchPlainText = (research: ResearchResponse) =>
  [
    research.title,
    research.summary,
    ...research.sections.flatMap((section) => [
      section.heading,
      ...section.bullets,
    ]),
  ].join('\n');

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

interface ResearchTokenMetadataContextValue {
  currentCurrency: string;
  tokensBySymbol: Readonly<Record<string, TrendingAsset>>;
}

const EMPTY_RESEARCH_TOKEN_METADATA: ResearchTokenMetadataContextValue = {
  currentCurrency: 'USD',
  tokensBySymbol: {},
};
const ResearchTokenMetadataContext =
  createContext<ResearchTokenMetadataContextValue>(
    EMPTY_RESEARCH_TOKEN_METADATA,
  );

const ResearchTokenMetadataResolver = React.memo(
  ({
    asset,
    onResolve,
    symbol,
  }: {
    asset?: WalletAssistantResearchAsset;
    onResolve: (symbol: string, token: TrendingAsset) => void;
    symbol: string;
  }) => {
    const { data } = useTokensFeed({
      chainIds: asset?.chainId ? [asset.chainId as CaipChainId] : undefined,
      query: symbol,
      hideRiskyTokens: true,
    });
    const token = useMemo(
      () =>
        data.find((candidate) => {
          if (candidate.symbol.toUpperCase() !== symbol.toUpperCase()) {
            return false;
          }

          const normalizedAssetId = candidate.assetId.toLowerCase();
          if (
            asset?.chainId &&
            !normalizedAssetId.startsWith(`${asset.chainId.toLowerCase()}/`)
          ) {
            return false;
          }
          if (
            asset?.contractAddress &&
            !normalizedAssetId.endsWith(
              `:${asset.contractAddress.toLowerCase()}`,
            )
          ) {
            return false;
          }

          return true;
        }),
      [asset?.chainId, asset?.contractAddress, data, symbol],
    );

    useEffect(() => {
      if (token) {
        onResolve(symbol, token);
      }
    }, [onResolve, symbol, token]);

    return null;
  },
);

const EnabledResearchTokenMetadataProvider = ({
  assets,
  children,
  seedTokens,
  symbols,
}: {
  assets: readonly WalletAssistantResearchAsset[];
  children: React.ReactNode;
  seedTokens: readonly TrendingAsset[];
  symbols: readonly string[];
}) => {
  const currentCurrency = useSelector(selectCurrentCurrency);
  const [tokensBySymbol, setTokensBySymbol] = useState<
    Record<string, TrendingAsset>
  >({});
  const normalizedSymbols = useMemo(
    () => getUniqueTokenSymbols(symbols),
    [symbols],
  );
  const assetsBySymbol = useMemo(
    () =>
      Object.fromEntries(
        assets.map((asset) => [asset.symbol.toUpperCase(), asset]),
      ),
    [assets],
  );
  const seededTokensBySymbol = useMemo(
    () =>
      Object.fromEntries(
        seedTokens
          .filter((token) => {
            const asset = assetsBySymbol[token.symbol.toUpperCase()];
            if (!asset) {
              return false;
            }
            const normalizedAssetId = token.assetId.toLowerCase();
            return (
              (!asset.chainId ||
                normalizedAssetId.startsWith(
                  `${asset.chainId.toLowerCase()}/`,
                )) &&
              (!asset.contractAddress ||
                normalizedAssetId.endsWith(
                  `:${asset.contractAddress.toLowerCase()}`,
                ))
            );
          })
          .map((token) => [token.symbol.toUpperCase(), token]),
      ),
    [assetsBySymbol, seedTokens],
  );
  const handleResolve = useCallback((symbol: string, token: TrendingAsset) => {
    setTokensBySymbol((current) =>
      current[symbol] === token ? current : { ...current, [symbol]: token },
    );
  }, []);
  const value = useMemo(
    () => ({
      currentCurrency,
      tokensBySymbol: { ...seededTokensBySymbol, ...tokensBySymbol },
    }),
    [currentCurrency, seededTokensBySymbol, tokensBySymbol],
  );

  return (
    <ResearchTokenMetadataContext.Provider value={value}>
      {normalizedSymbols.map((symbol) => (
        <ResearchTokenMetadataResolver
          asset={assetsBySymbol[symbol]}
          key={`${symbol}-${assetsBySymbol[symbol]?.chainId ?? ''}`}
          symbol={symbol}
          onResolve={handleResolve}
        />
      ))}
      {children}
    </ResearchTokenMetadataContext.Provider>
  );
};

const ResearchTokenMetadataProvider = ({
  assets,
  children,
  isEnabled,
  seedTokens,
  symbols,
}: {
  assets: readonly WalletAssistantResearchAsset[];
  children: React.ReactNode;
  isEnabled: boolean;
  seedTokens: readonly TrendingAsset[];
  symbols: readonly string[];
}) =>
  isEnabled ? (
    <EnabledResearchTokenMetadataProvider
      assets={assets}
      seedTokens={seedTokens}
      symbols={symbols}
    >
      {children}
    </EnabledResearchTokenMetadataProvider>
  ) : (
    <ResearchTokenMetadataContext.Provider
      value={EMPTY_RESEARCH_TOKEN_METADATA}
    >
      {children}
    </ResearchTokenMetadataContext.Provider>
  );

const TOKEN_PILL_MOVEMENT_STYLES: Record<
  TokenPillMovement,
  { textColor: TextColor }
> = {
  gain: {
    textColor: TextColor.SuccessDefault,
  },
  loss: {
    textColor: TextColor.ErrorDefault,
  },
  neutral: {
    textColor: TextColor.TextAlternative,
  },
};

const ResolvedContextualTokenPill = ({
  price,
  symbol,
  token,
}: {
  price: string | null;
  symbol: string;
  token: TrendingAsset;
}) => {
  const tw = useTailwind();
  const { onPress } = useTrendingTokenPress({
    token,
    tokenDetailsSource: TokenDetailsSource.WalletAssistant,
  });
  const movement = getTokenPillMovement(token.priceChangePct?.h24);
  const movementPresentation = TOKEN_PILL_MOVEMENT_PRESENTATION[movement];
  const movementStyle = TOKEN_PILL_MOVEMENT_STYLES[movement];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${symbol} token details`}
      onPress={onPress}
      style={({ pressed }) => tw.style(pressed && 'opacity-70')}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={1}
        twClassName={`rounded-full px-2 py-1 ${movementPresentation.background}`}
      >
        <TrendingTokenLogo
          assetId={token.assetId}
          symbol={token.symbol}
          size={16}
          recyclingKey={token.assetId}
        />
        <Text
          variant={TextVariant.BodySm}
          color={movementStyle.textColor}
          fontWeight={FontWeight.Medium}
        >
          {symbol}
          {price ? ` · ${price}` : ''}
          {movementPresentation.arrow}
        </Text>
      </Box>
    </Pressable>
  );
};

const ContextualTokenPill = ({ symbol }: { symbol: string }) => {
  const { currentCurrency, tokensBySymbol } = useContext(
    ResearchTokenMetadataContext,
  );
  const token = tokensBySymbol[symbol.toUpperCase()];
  const price =
    token && Number(token.price) > 0
      ? formatPriceWithSubscriptNotation(token.price, currentCurrency)
      : null;

  if (token) {
    return (
      <ResolvedContextualTokenPill
        price={price}
        symbol={symbol}
        token={token}
      />
    );
  }

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      gap={1}
      twClassName="rounded-full bg-muted px-2 py-1"
    >
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        fontWeight={FontWeight.Medium}
      >
        {symbol}
      </Text>
    </Box>
  );
};

const TokenizedText = React.memo(
  ({
    children,
    color = TextColor.TextDefault,
    tokens,
    variant = TextVariant.BodyMd,
  }: {
    children: string;
    color?: TextColor;
    tokens: string[];
    variant?: TextVariant;
  }) => {
    const { cleanText, normalizedTokens, parts, tokenSet } = useMemo(() => {
      const nextCleanText = stripMarkdownLinks(children);
      const nextNormalizedTokens = tokens.map((token) => token.toUpperCase());
      const nextTokenSet = new Set(nextNormalizedTokens);
      const tokenPattern = nextNormalizedTokens.map(escapeRegExp).join('|');

      return {
        cleanText: nextCleanText,
        normalizedTokens: nextNormalizedTokens,
        parts: tokenPattern
          ? nextCleanText.split(new RegExp(`(\\$?(?:${tokenPattern})\\b)`, 'g'))
          : [nextCleanText],
        tokenSet: nextTokenSet,
      };
    }, [children, tokens]);

    if (normalizedTokens.length === 0) {
      return (
        <Text variant={variant} color={color}>
          {cleanText}
        </Text>
      );
    }

    return (
      <Box twClassName="flex-row flex-wrap items-center gap-y-1">
        {parts.map((part, index) => {
          const symbol = part.replace(/^\$/, '').toUpperCase();
          if (!tokenSet.has(symbol)) {
            return (
              <Text key={`text-${index}`} variant={variant} color={color}>
                {part}
              </Text>
            );
          }

          return (
            <ContextualTokenPill key={`${symbol}-${index}`} symbol={symbol} />
          );
        })}
      </Box>
    );
  },
);

const AssistantResearch = React.memo(
  ({
    isTradeCardActive,
    onActivateTrade,
    research,
    resolveTokenMetadata,
    seedTokens,
    onOpenSource,
    onReviewSwap,
  }: {
    isTradeCardActive: boolean;
    onActivateTrade: () => void;
    research: ResearchResponse;
    resolveTokenMetadata: boolean;
    seedTokens: readonly TrendingAsset[];
    onOpenSource: (url: string) => void;
    onReviewSwap: (
      sourceToken: BridgeToken | undefined,
      destinationToken: BridgeToken | undefined,
      sourceAmount: string | undefined,
      quoteRequestId: string | undefined,
    ) => void;
  }) => {
    const tw = useTailwind();
    const [areSourcesExpanded, setAreSourcesExpanded] = useState(false);
    const safeSources = useMemo(
      () => research.sources.filter((source) => isSafeUrl(source.url)),
      [research.sources],
    );
    const sourceLogos = useMemo(
      () =>
        safeSources.map((source) => ({
          name: getSourceLabel(source),
          type: 'news' as const,
          url: source.url,
        })),
      [safeSources],
    );
    const sourcesById = useMemo(
      () => new Map(safeSources.map((source) => [source.id, source])),
      [safeSources],
    );
    const firstSourceLabel = sourceLogos[0]?.name;
    const sourceLabel =
      firstSourceLabel && sourceLogos.length > 1
        ? `${firstSourceLabel} +${sourceLogos.length - 1}`
        : firstSourceLabel;
    const chartPoints = useMemo(
      () =>
        research.chart.values.map((value, index) => ({
          label: research.chart.labels[index] ?? '',
          sourceTitle: sourcesById.get(research.chart.sourceIds[index])?.title,
          sourceUrl:
            sourcesById.get(research.chart.sourceIds[index])?.url ?? '',
          value,
        })),
      [
        research.chart.labels,
        research.chart.sourceIds,
        research.chart.values,
        sourcesById,
      ],
    );
    const hasTradeIntent =
      research.swapIntent.enabled &&
      Boolean(
        research.swapIntent.sourceSymbol ||
          research.swapIntent.destinationSymbol,
      );

    if (hasTradeIntent) {
      return (
        <Box twClassName="w-full">
          {isTradeCardActive ? (
            <EmbeddedSwapCard
              intent={research.swapIntent}
              onReview={onReviewSwap}
            />
          ) : (
            <Button
              variant={ButtonVariant.Secondary}
              size={ButtonSize.Md}
              isFullWidth
              onPress={onActivateTrade}
            >
              Review this trade
            </Button>
          )}
        </Box>
      );
    }

    return (
      <ResearchTokenMetadataProvider
        assets={research.assets}
        symbols={research.tokens}
        isEnabled={resolveTokenMetadata}
        seedTokens={seedTokens}
      >
        <Box twClassName="w-full gap-5">
          <Box twClassName="gap-2">
            <Text variant={TextVariant.HeadingMd} fontWeight={FontWeight.Bold}>
              {stripMarkdownLinks(research.title)}
            </Text>
            <TokenizedText
              tokens={research.tokens}
              color={TextColor.TextAlternative}
            >
              {research.summary}
            </TokenizedText>
            {Boolean(research.asOf) && (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                As of {research.asOf}
              </Text>
            )}

            {safeSources.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${safeSources.length} sources`}
                onPress={() => setAreSourcesExpanded((current) => !current)}
                style={({ pressed }) => tw.style(pressed && 'opacity-60')}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Between}
                  twClassName="py-2"
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    gap={2}
                  >
                    <SourceLogoGroup sources={sourceLogos} />
                    <Text
                      variant={TextVariant.BodySm}
                      color={TextColor.TextAlternative}
                      numberOfLines={1}
                    >
                      {sourceLabel}
                    </Text>
                  </Box>
                  <Icon
                    name={
                      areSourcesExpanded ? IconName.ArrowUp : IconName.ArrowDown
                    }
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                  />
                </Box>
              </Pressable>
            )}

            {areSourcesExpanded && (
              <Box twClassName="border-t border-muted">
                {safeSources.map((source, index) => (
                  <ArticleRow
                    key={`${source.url}-${index}`}
                    article={{
                      title: source.title,
                      source: getSourceLabel(source),
                      url: source.url,
                      date: source.date,
                    }}
                    onPress={onOpenSource}
                    isLastItem={index === safeSources.length - 1}
                  />
                ))}
              </Box>
            )}
          </Box>

          {research.sections.map((section, sectionIndex) => {
            const isLegalCopy =
              section.heading.trim().toLowerCase() === 'notes';

            return (
              <Box
                key={`${section.heading}-${sectionIndex}`}
                twClassName={isLegalCopy ? 'gap-2' : 'gap-3'}
              >
                {Boolean(section.heading) && (
                  <Text
                    variant={
                      isLegalCopy ? TextVariant.BodySm : TextVariant.HeadingSm
                    }
                    color={
                      isLegalCopy
                        ? TextColor.TextAlternative
                        : TextColor.TextDefault
                    }
                    fontWeight={isLegalCopy ? FontWeight.Medium : undefined}
                  >
                    {section.heading}
                  </Text>
                )}
                <Box twClassName={isLegalCopy ? 'gap-1' : 'gap-2'}>
                  {section.bullets.map((bullet, bulletIndex) => (
                    <Box
                      key={`${sectionIndex}-${bulletIndex}`}
                      twClassName="flex-row items-start gap-2"
                    >
                      <Text
                        variant={
                          isLegalCopy ? TextVariant.BodySm : TextVariant.BodyMd
                        }
                        color={
                          isLegalCopy
                            ? TextColor.TextAlternative
                            : TextColor.TextDefault
                        }
                      >
                        •
                      </Text>
                      <Box twClassName="flex-1">
                        <TokenizedText
                          tokens={research.tokens}
                          variant={
                            isLegalCopy
                              ? TextVariant.BodySm
                              : TextVariant.BodyMd
                          }
                          color={
                            isLegalCopy
                              ? TextColor.TextAlternative
                              : TextColor.TextDefault
                          }
                        >
                          {bullet}
                        </TokenizedText>
                        {(() => {
                          const evidence = section.evidence?.[bulletIndex];
                          const evidenceSources =
                            evidence?.sourceIds
                              .map((sourceId) => sourcesById.get(sourceId))
                              .filter(
                                (
                                  source,
                                ): source is WalletAssistantResearchSource =>
                                  source !== undefined,
                              ) ?? [];

                          if (
                            evidenceSources.length === 0 &&
                            evidence?.confidence !== 'low'
                          ) {
                            return null;
                          }

                          return (
                            <Box
                              flexDirection={BoxFlexDirection.Row}
                              alignItems={BoxAlignItems.Center}
                              gap={2}
                              twClassName="mt-1 flex-wrap"
                            >
                              {evidenceSources.map((source) => (
                                <Pressable
                                  key={source.id}
                                  accessibilityRole="link"
                                  accessibilityLabel={`Open source ${source.title}`}
                                  onPress={() => onOpenSource(source.url)}
                                  style={({ pressed }) =>
                                    tw.style(pressed && 'opacity-60')
                                  }
                                >
                                  <Text
                                    variant={TextVariant.BodySm}
                                    color={TextColor.PrimaryDefault}
                                  >
                                    {getSourceLabel(source)}
                                  </Text>
                                </Pressable>
                              ))}
                              {evidence?.confidence === 'low' && (
                                <Text
                                  variant={TextVariant.BodySm}
                                  color={TextColor.TextAlternative}
                                >
                                  Low confidence
                                </Text>
                              )}
                            </Box>
                          );
                        })()}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            );
          })}

          <ResearchChart
            title={research.chart.title}
            unit={research.chart.unit}
            points={chartPoints}
          />
        </Box>
      </ResearchTokenMetadataProvider>
    );
  },
);

const NOOP = () => undefined;
const TOKEN_METADATA_MESSAGE_LIMIT = 3;

interface ConversationHistoryProps {
  marketTokens: readonly TrendingAsset[];
  messages: Message[];
  onLatestUserAnchored: () => void;
  onOpenSource: (url: string) => void;
  onReviewPortfolioPlan: (plan: WalletAssistantPortfolioPlan) => void;
  onRetry: (prompt: string) => void;
  onReviewSwap: (
    sourceToken: BridgeToken | undefined,
    destinationToken: BridgeToken | undefined,
    sourceAmount: string | undefined,
    quoteRequestId: string | undefined,
  ) => void;
  scrollViewRef: React.RefObject<ScrollView | null>;
  shouldAnchorLatestMessage: React.RefObject<boolean>;
}

const ConversationHistory = React.memo(
  ({
    marketTokens,
    messages,
    onLatestUserAnchored,
    onOpenSource,
    onReviewPortfolioPlan,
    onRetry,
    onReviewSwap,
    scrollViewRef,
    shouldAnchorLatestMessage,
  }: ConversationHistoryProps) => {
    const latestUserMessageId = useMemo(
      () =>
        [...messages].reverse().find((message) => message.role === 'user')?.id,
      [messages],
    );
    const latestTradeMessageId = useMemo(
      () =>
        [...messages]
          .reverse()
          .find(
            (message) =>
              message.role === 'assistant' &&
              message.research?.swapIntent.enabled &&
              (message.research.swapIntent.sourceSymbol ||
                message.research.swapIntent.destinationSymbol),
          )?.id,
      [messages],
    );
    const recentAssistantMessageIds = useMemo(
      () =>
        new Set(
          messages
            .filter((message) => message.role === 'assistant')
            .slice(-TOKEN_METADATA_MESSAGE_LIMIT)
            .map((message) => message.id),
        ),
      [messages],
    );
    const messageEntries = useMemo(
      () => getConversationMessageEntries(messages),
      [messages],
    );
    const [activeTradeMessageId, setActiveTradeMessageId] =
      useState(latestTradeMessageId);

    useEffect(() => {
      if (latestTradeMessageId) {
        setActiveTradeMessageId(latestTradeMessageId);
      }
    }, [latestTradeMessageId]);

    return (
      <>
        {messageEntries.map(({ message, previousUserPrompt }) =>
          message.role === 'user' ? (
            <Box
              key={message.id}
              twClassName="self-end max-w-[82%] rounded-2xl bg-muted px-4 py-3"
              onLayout={(event) => {
                if (
                  message.id !== latestUserMessageId ||
                  !shouldAnchorLatestMessage.current
                ) {
                  return;
                }

                onLatestUserAnchored();
                scrollViewRef.current?.scrollTo({
                  y: Math.max(0, event.nativeEvent.layout.y - 16),
                  animated: true,
                });
              }}
            >
              <Text variant={TextVariant.BodyMd}>{message.text}</Text>
            </Box>
          ) : (
            <Box key={message.id} twClassName="w-full gap-3">
              {message.research ? (
                <AssistantResearch
                  research={message.research}
                  seedTokens={marketTokens}
                  resolveTokenMetadata={recentAssistantMessageIds.has(
                    message.id,
                  )}
                  isTradeCardActive={message.id === activeTradeMessageId}
                  onActivateTrade={() => setActiveTradeMessageId(message.id)}
                  onOpenSource={onOpenSource}
                  onReviewSwap={onReviewSwap}
                />
              ) : message.portfolioPlan ? (
                <PortfolioPlanCard
                  plan={message.portfolioPlan}
                  onReview={() => {
                    if (message.portfolioPlan) {
                      onReviewPortfolioPlan(message.portfolioPlan);
                    }
                  }}
                />
              ) : (
                <Text variant={TextVariant.BodyMd}>{message.text}</Text>
              )}
              {!message.portfolioPlan && (
                <AssistantResponseActions
                  responseText={message.text}
                  onRetry={() => {
                    if (previousUserPrompt) {
                      onRetry(previousUserPrompt);
                    }
                  }}
                  onThumbUp={NOOP}
                  onThumbDown={NOOP}
                />
              )}
            </Box>
          ),
        )}
      </>
    );
  },
);

/**
 * A single-screen, native agent surface. The chat transport is deliberately
 * isolated from transaction execution: this screen can prepare intent, but the
 * existing Bridge confirmation flow remains the only path to sign a swap.
 */
const WalletAssistant = () => {
  const navigation = useNavigation<AppNavigationProp>();
  const dispatch = useDispatch();
  const tw = useTailwind();
  const {
    isLoading: isPersistenceLoading,
    save: savePersistence,
    state: persistedState,
  } = useWalletAssistantPersistence();
  const hasHydratedPersistence = useRef(false);
  const selectedSourceChainIds = useSelector(selectSelectedSourceChainIds);
  const allowedChainRanking = useSelector(selectAllowedChainRanking);
  const batchSellDestinationsByChain = useSelector(
    selectBatchSellDestStablecoinsByChain,
  );
  const [draft, setDraft] = useState('');
  const draftResearchPlan = useMemo(() => buildResearchPlan(draft), [draft]);
  const walletChainIds = useMemo(
    () =>
      selectedSourceChainIds?.length
        ? selectedSourceChainIds
        : allowedChainRanking?.map((chain) => chain.chainId),
    [allowedChainRanking, selectedSourceChainIds],
  );
  const { tokensWithBalance: walletTokens } = useBalancesByAssetId({
    chainIds: walletChainIds,
  });
  const { data: localMarketTokens } = useTokensFeed({
    chainIds: draftResearchPlan.network
      ? [draftResearchPlan.network.caipChainId as CaipChainId]
      : undefined,
    hideRiskyTokens: true,
  });
  const { tokens: popularTokens } = usePopularTokens();
  const marketTokens = useMemo<TrendingAsset[]>(
    () => [
      ...localMarketTokens,
      ...popularTokens.map((token) => ({
        aggregatedUsdVolume: 0,
        assetId: token.assetId,
        decimals: 0,
        marketCap: 0,
        name: token.name,
        price: token.price === undefined ? '' : String(token.price),
        priceChangePct: {
          h24:
            token.priceChange1d === undefined
              ? undefined
              : String(token.priceChange1d),
        },
        symbol: token.symbol,
      })),
    ],
    [localMarketTokens, popularTokens],
  );
  const walletSnapshot = useMemo(
    () =>
      walletTokens
        .filter((token) => Number(token.balance ?? 0) > 0)
        .sort((a, b) => (b.tokenFiatAmount ?? 0) - (a.tokenFiatAmount ?? 0))
        .slice(0, 20)
        .map((token) => ({
          balance: token.balance,
          balanceFiat: token.balanceFiat,
          chainId: token.chainId,
          symbol: token.symbol,
        })),
    [walletTokens],
  );
  const walletContextValue = useMemo(
    () => ({
      activeChainId:
        selectedSourceChainIds?.length === 1
          ? String(selectedSourceChainIds[0])
          : '',
      tokensWithBalance: walletTokens,
    }),
    [selectedSourceChainIds, walletTokens],
  );
  const { height: windowHeight } = useWindowDimensions();
  const { brandColors, colors, themeAppearance } = useTheme();
  const reduceMotion = useReduceMotion();
  const scrollViewRef = useRef<ScrollView>(null);
  const landingBackgroundOpacity = useRef(new Animated.Value(0)).current;
  const landingContentProgress = useRef(new Animated.Value(0)).current;
  const newConversationSheetRef = useRef<BottomSheetRef>(null);
  const shouldAnchorLatestMessage = useRef(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [apiKey, setApiKey] = useState('');
  const [keyDraft, setKeyDraft] = useState('');
  const [isKeyLoading, setIsKeyLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isLandingBackgroundMounted, setIsLandingBackgroundMounted] =
    useState(false);
  const [isNewConversationSheetOpen, setIsNewConversationSheetOpen] =
    useState(false);
  const [requestStatus, setRequestStatus] = useState(
    AgentProgressStatus.Thinking,
  );
  const [error, setError] = useState('');
  const [errorRecovery, setErrorRecovery] = useState<OpenAIErrorRecovery>();
  const [trackedQuoteRequestId, setTrackedQuoteRequestId] = useState<
    string | undefined
  >();
  const bridgeHistory = useSelector(selectBridgeHistoryForAccount);
  const trackedHistoryItem = useMemo(
    () =>
      trackedQuoteRequestId
        ? Object.values(bridgeHistory).find(
            (item) => item.quote.requestId === trackedQuoteRequestId,
          )
        : undefined,
    [bridgeHistory, trackedQuoteRequestId],
  );

  const canSend = Boolean(apiKey) && draft.trim().length > 0 && !isLoading;
  const shouldShowLandingContent = Boolean(apiKey) && messages.length === 0;
  const landingGradientColor =
    themeAppearance === 'dark' ? brandColors.blue800 : brandColors.blue100;

  useEffect(() => {
    if (!shouldShowLandingContent) {
      landingBackgroundOpacity.stopAnimation();
      landingContentProgress.stopAnimation();
      landingBackgroundOpacity.setValue(0);
      landingContentProgress.setValue(0);
      setIsLandingBackgroundMounted(false);
      return undefined;
    }

    if (reduceMotion) {
      landingBackgroundOpacity.setValue(1);
      landingContentProgress.setValue(1);
      setIsLandingBackgroundMounted(true);
      return undefined;
    }

    setIsLandingBackgroundMounted(true);
    landingBackgroundOpacity.setValue(0);
    landingContentProgress.setValue(0);

    const landingAnimation = Animated.parallel([
      Animated.timing(landingBackgroundOpacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(landingContentProgress, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    landingAnimation.start();

    return () => landingAnimation.stop();
  }, [
    landingBackgroundOpacity,
    landingContentProgress,
    reduceMotion,
    shouldShowLandingContent,
  ]);

  useEffect(() => {
    const loadApiKey = async () => {
      try {
        const credentials = await Keychain.getGenericPassword({
          service: OPENAI_KEYCHAIN_SERVICE,
        });
        if (credentials) {
          setApiKey(credentials.password);
        }
      } finally {
        setIsKeyLoading(false);
      }
    };

    loadApiKey();
  }, []);

  useEffect(() => {
    if (isPersistenceLoading || hasHydratedPersistence.current) return;

    setMessages(persistedState.messages as Message[]);
    setTrackedQuoteRequestId(persistedState.trackedQuoteRequestId);
    hasHydratedPersistence.current = true;
  }, [isPersistenceLoading, persistedState]);

  useEffect(() => {
    if (!hasHydratedPersistence.current) return undefined;

    const saveTimer = setTimeout(() => {
      savePersistence({ messages, trackedQuoteRequestId }).catch(
        () => undefined,
      );
    }, 300);

    return () => clearTimeout(saveTimer);
  }, [messages, savePersistence, trackedQuoteRequestId]);

  useEffect(
    () => () => {
      requestControllerRef.current?.abort();
    },
    [],
  );

  const handleSaveApiKey = useCallback(async () => {
    const value = keyDraft.trim();
    if (!value) return;

    setIsKeyLoading(true);
    setError('');
    try {
      await Keychain.setGenericPassword('openai', value, {
        service: OPENAI_KEYCHAIN_SERVICE,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
      setApiKey(value);
      setKeyDraft('');
      setErrorRecovery(undefined);
    } catch {
      setError('Could not save the API key securely. Please try again.');
    } finally {
      setIsKeyLoading(false);
    }
  }, [keyDraft]);

  const handleSend = useCallback(async () => {
    const text = draft.trim();
    if (!text || !apiKey || isLoading) return;

    const nextMessages: Message[] = [
      ...messages,
      { id: `user-${messages.length}`, role: 'user', text },
    ];
    const portfolioPlanRequest = parsePortfolioPlanRequest(text);
    if (portfolioPlanRequest) {
      if (messages.length === 0 && !reduceMotion) {
        LayoutAnimation.configureNext(FIRST_CHAT_LAYOUT_ANIMATION);
      }
      shouldAnchorLatestMessage.current = true;
      setMessages(nextMessages);
      setDraft('');
      setError('');
      setErrorRecovery(undefined);
      setIsLoading(true);
      setRequestStatus(AgentProgressStatus.PreparingPlan);

      try {
        const assetIds = walletTokens
          .map(getWalletTokenAssetId)
          .filter((assetId): assetId is NonNullable<typeof assetId> =>
            Boolean(assetId),
          );
        const assetIdBatches = Array.from(
          { length: Math.ceil(assetIds.length / 100) },
          (_, index) => assetIds.slice(index * 100, (index + 1) * 100),
        );
        const assets = (
          await Promise.all(
            assetIdBatches.map((batch) =>
              fetchTokenAssets(batch, {
                includeLabels: true,
              }),
            ),
          )
        ).flat();
        const portfolioPlan = buildPortfolioPlan({
          destinationTokensByChain: batchSellDestinationsByChain,
          labelsByAssetId: getTokenLabelsByAssetId(assets),
          request: portfolioPlanRequest,
          walletTokens,
        });

        setMessages((current) => [
          ...current,
          {
            id: `assistant-${current.length}`,
            portfolioPlan,
            role: 'assistant',
            text: `Consolidate ${portfolioPlan.sourceTokens.length} positions into ${portfolioPlan.destinationSymbol}.`,
          },
        ]);
      } catch {
        setError('Could not prepare this portfolio plan. Please try again.');
        setDraft(text);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    const previousAssistantMessage = [...messages]
      .reverse()
      .find((message) => message.role === 'assistant');
    const previousTradeIntent = previousAssistantMessage?.research?.swapIntent
      .enabled
      ? previousAssistantMessage.research.swapIntent
      : undefined;
    const researchNetworkContext = getResearchNetworkContext(
      previousAssistantMessage?.research,
    );
    const immediateTradeResponse = buildImmediateTradeResponse(
      text,
      previousTradeIntent,
      researchNetworkContext,
    );
    const researchPlan = buildResearchPlan(text);
    if (isLocalMemeMarketListRequest(text)) {
      if (messages.length === 0 && !reduceMotion) {
        LayoutAnimation.configureNext(FIRST_CHAT_LAYOUT_ANIMATION);
      }
      shouldAnchorLatestMessage.current = true;
      setMessages(nextMessages);
      setDraft('');
      setError('');
      setErrorRecovery(undefined);
      setIsLoading(true);
      setRequestStatus(AgentProgressStatus.CheckingPrices);

      try {
        const marketDataTokens =
          localMarketTokens.length > 0 || !researchPlan.network
            ? localMarketTokens
            : await getTrendingTokens({
                chainIds: [
                  researchPlan.network.caipChainId as CaipChainId,
                ],
                excludeLabels: ['stable_coin', 'blue_chip'],
                includeTokenSecurityData: true,
              });
        const tokens = marketDataTokens.filter(({ securityData }) => {
          const resultType = securityData?.resultType;
          return (
            !resultType ||
            resultType === 'Verified' ||
            resultType === 'Benign'
          );
        });
        const assetIds = tokens.map(
          ({ assetId }) => assetId as CaipAssetType,
        );
        const assetIdBatches = Array.from(
          { length: Math.ceil(assetIds.length / 100) },
          (_, index) => assetIds.slice(index * 100, (index + 1) * 100),
        );
        const assets = (
          await Promise.all(
            assetIdBatches.map((batch) =>
              fetchTokenAssets(batch, {
                includeLabels: true,
              }),
            ),
          )
        ).flat();
        const research = buildLocalMarketListResponse(
          text,
          tokens,
          researchPlan.network,
          getTokenLabelsByAssetId(assets),
        );

        if (!research) {
          throw new Error('Unable to build local market response');
        }
        setMessages((current) => [
          ...current,
          {
            id: `assistant-${current.length}`,
            role: 'assistant',
            research,
            text: getResearchPlainText(research),
          },
        ]);
      } catch {
        setError(
          'Could not load MetaMask market data. Please try again shortly.',
        );
        setDraft(text);
      } finally {
        setIsLoading(false);
      }
      return;
    }
    const immediateResearchResponse =
      immediateTradeResponse ??
      buildLocalPriceResponse(researchPlan, text) ??
      buildLocalMarketListResponse(
        text,
        localMarketTokens,
        researchPlan.network,
      );
    if (messages.length === 0 && !reduceMotion) {
      LayoutAnimation.configureNext(FIRST_CHAT_LAYOUT_ANIMATION);
    }
    shouldAnchorLatestMessage.current = true;
    setMessages(
      immediateResearchResponse
        ? [
            ...nextMessages,
            {
              id: `assistant-${nextMessages.length}`,
              role: 'assistant',
              research: immediateResearchResponse,
              text: getResearchPlainText(immediateResearchResponse),
            },
          ]
        : nextMessages,
    );
    setDraft('');
    setError('');
    setErrorRecovery(undefined);
    if (immediateResearchResponse) {
      return;
    }
    setIsLoading(true);
    const requestController = new AbortController();
    requestControllerRef.current = requestController;
    const useWebResearch = researchPlan.useWebSearch;
    const initialResearchDomains = getInitialResearchDomains(researchPlan);
    const networkContextInstructions = getNetworkContextInstructions(text);
    const secureRequestParts = buildSecureOpenAIRequestParts({
      baseInstructions: [
        BASE_OPENAI_INSTRUCTIONS,
        getResearchPlanInstructions(researchPlan),
        networkContextInstructions,
      ]
        .filter(Boolean)
        .join('\n\n'),
      messages: nextMessages,
      userPrompt: text,
      walletSnapshot,
    });
    setRequestStatus(
      useWebResearch
        ? AgentProgressStatus.SearchingWeb
        : AgentProgressStatus.Thinking,
    );
    const statusTimer = setTimeout(
      () =>
        setRequestStatus(
          useWebResearch
            ? AgentProgressStatus.CheckingPrices
            : AgentProgressStatus.Thinking,
        ),
      useWebResearch ? 5000 : 2500,
    );

    try {
      const requestResearch = (
        instructions: string,
        allowedDomains?: string[],
      ) =>
        streamOpenAIResponse({
          apiKey,
          fetchImplementation: expoFetch as typeof fetch,
          signal: requestController.signal,
          onTextDelta: () => setRequestStatus(AgentProgressStatus.Thinking),
          body: {
            model: 'gpt-5-mini',
            reasoning: { effort: useWebResearch ? 'low' : 'minimal' },
            instructions,
            ...(useWebResearch
              ? {
                  tools: [
                    {
                      type: 'web_search',
                      search_context_size: researchPlan.searchContextSize,
                      ...(allowedDomains?.length
                        ? {
                            filters: {
                              allowed_domains: allowedDomains,
                            },
                          }
                        : {}),
                    },
                  ],
                  tool_choice: 'auto',
                }
              : {}),
            text: {
              verbosity: 'low',
              format: {
                type: 'json_schema',
                name: 'wallet_research',
                strict: true,
                schema: RESEARCH_RESPONSE_SCHEMA,
              },
            },
            input: secureRequestParts.input,
          },
        });
      const parseResearch = (responseText: string) =>
        prioritizeDirectTradeRequest(
          text,
          applyResearchPlanIdentity(
            researchPlan,
            parseWalletAssistantResearchResponse(responseText),
          ),
        );
      const requestParsedResearch = async (
        instructions: string,
        allowedDomains?: string[],
      ) => {
        for (let attempt = 0; attempt < 2; attempt += 1) {
          const result = await requestResearch(
            attempt === 0
              ? instructions
              : `${instructions}\n\n${STRUCTURED_RESPONSE_RETRY_INSTRUCTIONS}`,
            allowedDomains,
          );
          const responseText =
            result.text ||
            getResponseText((result.response ?? {}) as OpenAIResponse);

          try {
            if (!responseText) {
              throw new MalformedOpenAIResponseError();
            }
            return parseResearch(responseText);
          } catch (parseError) {
            if (
              !(parseError instanceof MalformedOpenAIResponseError) ||
              attempt === 1
            ) {
              throw parseError;
            }
            setRequestStatus(AgentProgressStatus.Thinking);
          }
        }

        throw new MalformedOpenAIResponseError();
      };
      let research = await requestParsedResearch(
        secureRequestParts.instructions,
        initialResearchDomains,
      );

      if (shouldBroadenInitialResearch(researchPlan, research)) {
        setRequestStatus(AgentProgressStatus.SearchingWeb);
        research = await requestParsedResearch(
          `${secureRequestParts.instructions}\n\n${BROAD_RESEARCH_RETRY_INSTRUCTIONS}`,
        );
      }

      if (hasNetworkContextMismatch(text, research)) {
        setRequestStatus(AgentProgressStatus.SearchingWeb);
        research = await requestParsedResearch(
          `${secureRequestParts.instructions}\n\n${ROBINHOOD_CHAIN_RETRY_INSTRUCTIONS}`,
        );
        if (hasNetworkContextMismatch(text, research)) {
          throw new MalformedOpenAIResponseError();
        }
      }

      setMessages((current) => [
        ...current,
        {
          id: `assistant-${current.length}`,
          role: 'assistant',
          research,
          text: getResearchPlainText(research),
        },
      ]);
    } catch (requestError) {
      if (requestController.signal.aborted) {
        return;
      }
      const recovery = classifyOpenAIError(requestError);
      setErrorRecovery(recovery);
      setError(recovery.message);
      setDraft((current) => current || text);
    } finally {
      clearTimeout(statusTimer);
      if (requestControllerRef.current === requestController) {
        requestControllerRef.current = null;
      }
      setIsLoading(false);
    }
  }, [
    apiKey,
    batchSellDestinationsByChain,
    draft,
    isLoading,
    localMarketTokens,
    messages,
    reduceMotion,
    walletSnapshot,
    walletTokens,
  ]);

  const handleStop = useCallback(() => {
    requestControllerRef.current?.abort();
  }, []);

  const handleReplaceApiKey = useCallback(async () => {
    await Keychain.resetGenericPassword({
      service: OPENAI_KEYCHAIN_SERVICE,
    }).catch(() => undefined);
    setApiKey('');
    setError('');
    setErrorRecovery(undefined);
  }, []);

  const handleStartNewConversation = useCallback(async () => {
    requestControllerRef.current?.abort();
    setMessages([]);
    setDraft('');
    setError('');
    setErrorRecovery(undefined);
    setTrackedQuoteRequestId(undefined);
    await savePersistence({
      messages: [],
      trackedQuoteRequestId: undefined,
    });
  }, [savePersistence]);

  const handlePressNewConversation = useCallback(() => {
    if (isLoading) {
      return;
    }

    setIsNewConversationSheetOpen(true);
  }, [isLoading]);

  const handleDismissNewConversationSheet = useCallback(() => {
    newConversationSheetRef.current?.onCloseBottomSheet();
  }, []);

  const handleConfirmNewConversation = useCallback(() => {
    newConversationSheetRef.current?.onCloseBottomSheet(() => {
      handleStartNewConversation()
        .catch(() => {
          setError('Could not start a new conversation. Try again.');
        })
        .finally(() => {
          setIsNewConversationSheetOpen(false);
        });
    });
  }, [handleStartNewConversation]);

  const handleNewConversationSheetClosed = useCallback(() => {
    setIsNewConversationSheetOpen(false);
  }, []);

  const handleReviewSwap = useCallback(
    (
      sourceToken: BridgeToken | undefined,
      destinationToken: BridgeToken | undefined,
      sourceAmount: string | undefined,
      quoteRequestId: string | undefined,
    ) => {
      setTrackedQuoteRequestId(quoteRequestId);
      navigation.navigate(Routes.BRIDGE.BRIDGE_VIEW, {
        sourcePage: Routes.BRIDGE.WALLET_ASSISTANT,
        location: MetaMetricsSwapsEventSource.MainView,
        bridgeViewMode: BridgeViewMode.Swap,
        sourceToken,
        destToken: destinationToken,
        sourceAmount,
        autoFocusSourceAmountInput: !sourceAmount,
        scrollToTopOnNav: true,
      });
    },
    [navigation],
  );

  const handleReviewPortfolioPlan = useCallback(
    (plan: WalletAssistantPortfolioPlan) => {
      if (
        plan.status !== 'ready' ||
        plan.sourceTokens.length === 0 ||
        !plan.sourceChainId
      ) {
        return;
      }

      dispatch(setBatchSellSourceTokens(plan.sourceTokens));
      navigation.navigate(Routes.BRIDGE.ROOT, {
        screen: Routes.BRIDGE.BATCH_SELL_TOKEN_SELECT,
        params: {
          batchSellLocation: BatchSellMetricsLocation.Unknown,
          preferredDestinationSymbol: plan.destinationSymbol,
          preserveBridgeState: true,
        },
      });
    },
    [dispatch, navigation],
  );

  const handleRetryResponse = useCallback((prompt: string) => {
    setDraft(prompt);
    setError('');
  }, []);

  const handleLatestUserAnchored = useCallback(() => {
    shouldAnchorLatestMessage.current = false;
  }, []);

  const handleOpenSource = useCallback(
    (url: string) => {
      if (!isSafeUrl(url)) return;

      navigation.navigate(Routes.BROWSER.HOME, {
        screen: Routes.BROWSER.VIEW,
        params: {
          newTabUrl: url,
          timestamp: Date.now(),
          fromWhatsHappening: true,
        },
      });
    },
    [navigation],
  );

  return (
    <WalletAssistantWalletContext.Provider value={walletContextValue}>
      <SafeAreaView
        edges={['bottom', 'left', 'right']}
        style={tw`flex-1 bg-default`}
      >
        {isLandingBackgroundMounted && (
          <Animated.View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              { opacity: landingBackgroundOpacity },
            ]}
          >
            <LinearGradient
              colors={[
                colors.background.default,
                colors.background.default,
                landingGradientColor,
              ]}
              end={{ x: 0.5, y: 1 }}
              locations={[0, 0.32, 1]}
              start={{ x: 0.5, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        )}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={tw`flex-1`}
        >
          <HeaderStandard
            title="Wallet assistant"
            onBack={() => navigation.goBack()}
            endButtonIconProps={
              messages.length > 0
                ? [
                    {
                      iconName: IconName.Add,
                      onPress: handlePressNewConversation,
                      disabled: isLoading,
                      accessibilityLabel: 'Start new conversation',
                      accessibilityHint:
                        'Asks for confirmation before clearing the current conversation',
                      accessibilityRole: 'button',
                      accessibilityState: { disabled: isLoading },
                      testID:
                        ConversationControlsTestIds.NEW_CONVERSATION_BUTTON,
                    },
                  ]
                : undefined
            }
            includesTopInset
          />
          <ScrollView
            ref={scrollViewRef}
            style={tw`flex-1`}
            contentContainerStyle={tw.style(
              'flex-grow px-4 pb-4',
              apiKey && messages.length === 0 ? 'justify-center' : 'pt-4',
            )}
            keyboardShouldPersistTaps="handled"
          >
            {!isKeyLoading && !apiKey && (
              <Box twClassName="flex-1 justify-center gap-4">
                <Box twClassName="gap-2">
                  <Text variant={TextVariant.HeadingMd}>
                    Connect your OpenAI key
                  </Text>
                  <Text
                    variant={TextVariant.BodyMd}
                    color={TextColor.TextAlternative}
                  >
                    Enter it once. It is stored in this device’s secure Keychain
                    and is never added to the app source.
                  </Text>
                </Box>
                <TextField
                  value={keyDraft}
                  onChangeText={setKeyDraft}
                  placeholder="OpenAI API key"
                  inputProps={{
                    secureTextEntry: true,
                    autoCapitalize: 'none',
                    autoCorrect: false,
                    autoComplete: 'off',
                    textContentType: 'none',
                    importantForAutofill: 'no',
                    accessibilityLabel: 'OpenAI API key',
                    returnKeyType: 'done',
                    onSubmitEditing: handleSaveApiKey,
                  }}
                />
                <Button
                  variant={ButtonVariant.Primary}
                  size={ButtonSize.Lg}
                  isFullWidth
                  isDisabled={!keyDraft.trim()}
                  onPress={handleSaveApiKey}
                >
                  Save key securely
                </Button>
              </Box>
            )}

            {Boolean(apiKey) && messages.length === 0 && (
              <Animated.View
                style={{
                  opacity: landingContentProgress,
                  transform: [
                    {
                      translateY: landingContentProgress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10, 0],
                      }),
                    },
                  ],
                }}
              >
                <Box twClassName="items-start gap-3 pb-10">
                  <Box twClassName="mb-1">
                    <Text variant={TextVariant.HeadingMd}>
                      Where should we start?
                    </Text>
                  </Box>
                  {PROMPT_EXAMPLES.map((example) => (
                    <Button
                      key={example.label}
                      variant={ButtonVariant.Secondary}
                      size={ButtonSize.Sm}
                      startIconName={example.icon}
                      twClassName="rounded-full"
                      hitSlop={6}
                      onPress={() => setDraft(example.prompt)}
                    >
                      {example.label}
                    </Button>
                  ))}
                </Box>
              </Animated.View>
            )}

            <Box twClassName="gap-7">
              <ConversationHistory
                marketTokens={marketTokens}
                messages={messages}
                onLatestUserAnchored={handleLatestUserAnchored}
                onOpenSource={handleOpenSource}
                onReviewPortfolioPlan={handleReviewPortfolioPlan}
                onRetry={handleRetryResponse}
                onReviewSwap={handleReviewSwap}
                scrollViewRef={scrollViewRef}
                shouldAnchorLatestMessage={shouldAnchorLatestMessage}
              />
              {isLoading && <AgentProgress status={requestStatus} />}
              {Boolean(error) && (
                <Box twClassName="items-start gap-2">
                  <Text
                    variant={TextVariant.BodySm}
                    color={TextColor.ErrorDefault}
                  >
                    {error}
                  </Text>
                  {errorRecovery?.retryable && (
                    <Button
                      variant={ButtonVariant.Secondary}
                      size={ButtonSize.Sm}
                      onPress={handleSend}
                    >
                      Try again
                    </Button>
                  )}
                  {errorRecovery?.showApiKeySettings && (
                    <Button
                      variant={ButtonVariant.Secondary}
                      size={ButtonSize.Sm}
                      onPress={handleReplaceApiKey}
                    >
                      Update API key
                    </Button>
                  )}
                </Box>
              )}
              {trackedHistoryItem && (
                <WalletAssistantTransactionStatusCard
                  historyItem={trackedHistoryItem}
                />
              )}
              {isLoading && <Box style={{ height: windowHeight * 0.5 }} />}
            </Box>
          </ScrollView>

          <Box twClassName="px-4 pb-2 pt-2">
            <TextField
              value={draft}
              onChangeText={setDraft}
              placeholder="Ask anything"
              isDisabled={!apiKey}
              twClassName="h-14 rounded-full border-muted bg-muted pl-4 pr-1.5"
              inputProps={{
                accessibilityLabel: 'Wallet assistant message',
                autoComplete: 'off',
                textContentType: 'none',
                importantForAutofill: 'no',
                returnKeyType: 'send',
                blurOnSubmit: false,
                onSubmitEditing: handleSend,
              }}
              endAccessory={
                isLoading ? (
                  <ButtonIcon
                    iconName={IconName.Close}
                    size={ButtonIconSize.Lg}
                    variant={ButtonIconVariant.Floating}
                    style={tw.style('h-11 w-11 rounded-full bg-default')}
                    iconProps={{ color: IconColor.IconDefault }}
                    onPress={handleStop}
                    accessibilityLabel="Stop response"
                  />
                ) : (
                  <ButtonIcon
                    iconName={IconName.Arrow2Up}
                    size={ButtonIconSize.Lg}
                    variant={ButtonIconVariant.Floating}
                    style={tw.style(
                      'h-11 w-11 rounded-full bg-default',
                      !canSend && 'opacity-40',
                    )}
                    iconProps={{ color: IconColor.IconDefault }}
                    isDisabled={!canSend}
                    onPress={handleSend}
                    accessibilityLabel="Send message"
                  />
                )
              }
            />
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="mt-2 text-center"
            >
              AI-generated content is not financial advice.
            </Text>
          </Box>
        </KeyboardAvoidingView>
        {isNewConversationSheetOpen && (
          <BottomSheet
            ref={newConversationSheetRef}
            onClose={handleNewConversationSheetClosed}
            testID={ConversationControlsTestIds.CONFIRMATION_SHEET}
          >
            <BottomSheetHeader>Start a new conversation?</BottomSheetHeader>
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
              twClassName="px-6 pb-4"
            >
              This clears this conversation and its saved swap activity. Your
              OpenAI API key stays securely saved.
            </Text>
            <BottomSheetFooter
              buttonsAlignment={ButtonsAlignment.Vertical}
              primaryButtonProps={{
                children: 'Start new',
                isDanger: true,
                onPress: handleConfirmNewConversation,
                testID: ConversationControlsTestIds.CONFIRM_BUTTON,
              }}
              secondaryButtonProps={{
                children: 'Cancel',
                onPress: handleDismissNewConversationSheet,
                testID: ConversationControlsTestIds.CANCEL_BUTTON,
              }}
            />
          </BottomSheet>
        )}
      </SafeAreaView>
    </WalletAssistantWalletContext.Provider>
  );
};

export default WalletAssistant;
