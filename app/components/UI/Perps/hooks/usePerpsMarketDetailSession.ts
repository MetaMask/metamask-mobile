import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import performance from 'react-native-performance';
import { useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import {
  annotateTraceByRequest,
  endTrace,
  setTraceMeasurement,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { selectHip3ConfigVersion } from '../selectors/featureFlags';
import {
  selectPerpsNetwork,
  selectPerpsProvider,
} from '../selectors/perpsController';
import { selectPerpsSelectedAccountAddress } from '../selectors/selectedAccountAddress';
import { getStreamManagerInstance } from '../providers/PerpsStreamManager';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import { buildPerpsCufStartTags } from '../utils/perpsCufTrace';
import { PERPS_LOADING_SESSION_TIMEOUT_MS } from '../utils/perpsLoadingSession';
import { usePerpsMarketContext } from './usePerpsMarketContext';

export const PERPS_MARKET_DETAIL_SECTION = {
  MARKET: 'market',
  PRICE: 'price',
  CHART: 'chart',
  STATS: 'stats',
  INSIGHTS: 'insights',
  ACCOUNT: 'account',
  ORDER_BOOK: 'order_book',
  POSITIONS_ORDERS: 'positions_orders',
} as const;

export type PerpsMarketDetailSection =
  (typeof PERPS_MARKET_DETAIL_SECTION)[keyof typeof PERPS_MARKET_DETAIL_SECTION];

export type PerpsMarketDetailSectionState =
  | 'loading'
  | 'content'
  | 'empty'
  | 'error'
  | 'not_applicable';

export type PerpsMarketDetailSections = Partial<
  Record<PerpsMarketDetailSection, PerpsMarketDetailSectionState>
>;

export type PerpsMarketDetailGenerationTrigger =
  | 'initial'
  | 'background_resume'
  | 'market_switch'
  | 'mode_switch'
  | 'account_switch'
  | 'network_switch'
  | 'configuration_change';

const SECTION_MEASUREMENTS: Record<PerpsMarketDetailSection, string> = {
  market: 'market_resolved_ms',
  price: 'price_resolved_ms',
  chart: 'chart_resolved_ms',
  stats: 'stats_resolved_ms',
  insights: 'insights_resolved_ms',
  account: 'account_resolved_ms',
  order_book: 'order_book_resolved_ms',
  positions_orders: 'positions_orders_resolved_ms',
};

const PROOF_MARKER = '[PerpsDetailLoadProof]';

interface ActiveDetailSession {
  id: string;
  mode: 'lite' | 'pro';
  symbol: string;
  startedAtMs: number;
  expectedSections: PerpsMarketDetailSection[];
  recordedSections: Set<PerpsMarketDetailSection>;
  sectionOffsetsMs: Partial<Record<PerpsMarketDetailSection, number>>;
  sectionStates: PerpsMarketDetailSections;
  deliveryBaselines?: StreamDeliveryRevisions;
  connectionGenerationBaseline?: number;
  requiresCandleFreshness: boolean;
  timeout: ReturnType<typeof setTimeout>;
}

interface StreamDeliveryRevisions {
  account: number;
  candles: number;
  focusedPrice: number;
  orders: number;
  positions: number;
  prices: number;
}

interface DetailGenerationIdentity {
  address?: string;
  configuredChartLibrary: string;
  configurationKey: string;
  entrySource?: string;
  expectedSectionsKey: string;
  foregroundGeneration: number;
  hip3ConfigVersion: number;
  network: string;
  provider?: string;
  symbol: string;
}

function resolveGenerationTrigger(
  previous: DetailGenerationIdentity | null,
  current: DetailGenerationIdentity,
  surfaceTrigger: Extract<
    PerpsMarketDetailGenerationTrigger,
    'initial' | 'market_switch' | 'mode_switch'
  >,
  activeTrigger: PerpsMarketDetailGenerationTrigger,
): PerpsMarketDetailGenerationTrigger {
  if (!previous) {
    return surfaceTrigger;
  }
  if (previous.foregroundGeneration !== current.foregroundGeneration) {
    return 'background_resume';
  }
  if (previous.symbol !== current.symbol) {
    return 'market_switch';
  }
  if (previous.address !== current.address) {
    return 'account_switch';
  }
  if (
    previous.provider !== current.provider ||
    previous.network !== current.network ||
    previous.hip3ConfigVersion !== current.hip3ConfigVersion
  ) {
    return 'network_switch';
  }
  if (
    previous.configurationKey !== current.configurationKey ||
    previous.configuredChartLibrary !== current.configuredChartLibrary ||
    previous.entrySource !== current.entrySource ||
    previous.expectedSectionsKey !== current.expectedSectionsKey
  ) {
    return 'configuration_change';
  }
  return activeTrigger;
}

interface UsePerpsMarketDetailSessionOptions {
  mode: 'lite' | 'pro';
  symbol?: string;
  configuredChartLibrary: string;
  renderedChartLibrary: string;
  marketSource: 'route' | 'stream_enrichment' | 'unknown';
  surfaceTrigger?: Extract<
    PerpsMarketDetailGenerationTrigger,
    'initial' | 'market_switch' | 'mode_switch'
  >;
  entrySource?: string;
  configurationKey?: string;
  sections: PerpsMarketDetailSections;
}

interface UsePerpsMarketDetailSessionResult {
  generationTrigger: PerpsMarketDetailGenerationTrigger;
  isActive: boolean;
  liveResetKey: string;
}

interface EndSessionOptions {
  success: boolean;
  reason?: string;
  failureReason?: string;
  missingSections?: PerpsMarketDetailSection[];
  hasSectionError?: boolean;
}

const roundedOffsets = (
  offsets: Partial<Record<PerpsMarketDetailSection, number>>,
) =>
  Object.fromEntries(
    Object.entries(offsets).map(([section, offset]) => [
      section,
      Number(offset.toFixed(3)),
    ]),
  );

const getStreamDeliveryRevisions = (): StreamDeliveryRevisions => {
  const stream = getStreamManagerInstance();
  return {
    account: stream.account.getDeliveryRevision(),
    candles: stream.candles.getDeliveryRevision(),
    focusedPrice: stream.focusedPrice.getDeliveryRevision(),
    orders: stream.orders.getDeliveryRevision(),
    positions: stream.positions.getDeliveryRevision(),
    prices: stream.prices.getDeliveryRevision(),
  };
};

const hasFreshSectionDelivery = (
  section: PerpsMarketDetailSection,
  baseline: StreamDeliveryRevisions | undefined,
  connectionGenerationBaseline: number | undefined,
  requiresCandleFreshness: boolean,
): boolean => {
  if (!baseline) {
    return true;
  }
  const current = getStreamDeliveryRevisions();
  const connectionAdvanced =
    connectionGenerationBaseline !== undefined &&
    PerpsConnectionManager.getConnectionGeneration() >
      connectionGenerationBaseline;
  switch (section) {
    case PERPS_MARKET_DETAIL_SECTION.PRICE:
      return (
        connectionAdvanced &&
        (current.focusedPrice > baseline.focusedPrice ||
          current.prices > baseline.prices)
      );
    case PERPS_MARKET_DETAIL_SECTION.CHART:
      return (
        !requiresCandleFreshness ||
        (connectionAdvanced && current.candles > baseline.candles)
      );
    case PERPS_MARKET_DETAIL_SECTION.ACCOUNT:
      return connectionAdvanced && current.account > baseline.account;
    case PERPS_MARKET_DETAIL_SECTION.ORDER_BOOK:
      // Pro readiness is reset by market-context generation and resolves only
      // after the dedicated aggregated order-book socket delivers again.
      return true;
    case PERPS_MARKET_DETAIL_SECTION.POSITIONS_ORDERS:
      return (
        connectionAdvanced &&
        current.positions > baseline.positions &&
        current.orders > baseline.orders
      );
    default:
      return true;
  }
};

/**
 * Owns one market-detail trace per market/mode/account/provider generation.
 * The trace stores only detail-mount-relative section offsets. Existing chart,
 * stream, controller, and minimum-useful-detail traces keep their own timing.
 */
export function usePerpsMarketDetailSession({
  mode,
  symbol,
  configuredChartLibrary,
  renderedChartLibrary,
  marketSource,
  surfaceTrigger = 'initial',
  entrySource,
  configurationKey = '',
  sections,
}: UsePerpsMarketDetailSessionOptions): UsePerpsMarketDetailSessionResult {
  const address = useSelector(selectPerpsSelectedAccountAddress);
  const network = useSelector(selectPerpsNetwork);
  const provider = useSelector(selectPerpsProvider);
  const hip3ConfigVersion = useSelector(selectHip3ConfigVersion);
  const { isReady: isMarketContextReady, isUserReady: isUserContextReady } =
    usePerpsMarketContext();
  const activeSessionRef = useRef<ActiveDetailSession | null>(null);
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const renderedChartLibraryRef = useRef(renderedChartLibrary);
  renderedChartLibraryRef.current = renderedChartLibrary;
  const marketSourceRef = useRef(marketSource);
  marketSourceRef.current = marketSource;
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const [foregroundGeneration, setForegroundGeneration] = useState(0);
  const [sessionRevision, setSessionRevision] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const activeGenerationTriggerRef =
    useRef<PerpsMarketDetailGenerationTrigger>(surfaceTrigger);
  const previousGenerationRef = useRef<DetailGenerationIdentity | null>(null);

  const expectedSectionsKey = useMemo(
    () =>
      Object.keys(sections)
        .sort((first, second) => first.localeCompare(second))
        .join('|'),
    [sections],
  );
  const sectionStatesKey = useMemo(
    () =>
      Object.entries(sections)
        .sort(([first], [second]) => first.localeCompare(second))
        .map(([section, state]) => `${section}:${state}`)
        .join('|'),
    [sections],
  );
  const streamDeliveryRevisionsKey = Object.values(
    getStreamDeliveryRevisions(),
  ).join('|');
  const generationIdentity: DetailGenerationIdentity | null = symbol
    ? {
        address,
        configuredChartLibrary,
        configurationKey,
        entrySource,
        expectedSectionsKey,
        foregroundGeneration,
        hip3ConfigVersion,
        network,
        provider,
        symbol,
      }
    : null;
  const generationIdentityRef = useRef(generationIdentity);
  generationIdentityRef.current = generationIdentity;
  const generationTrigger = generationIdentity
    ? resolveGenerationTrigger(
        previousGenerationRef.current,
        generationIdentity,
        surfaceTrigger,
        activeGenerationTriggerRef.current,
      )
    : activeGenerationTriggerRef.current;
  const liveResetKey = useMemo(
    () =>
      JSON.stringify([
        mode,
        symbol ?? '',
        address ?? '',
        provider ?? '',
        network,
        hip3ConfigVersion,
        foregroundGeneration,
        configuredChartLibrary,
        entrySource ?? '',
      ]),
    [
      address,
      configuredChartLibrary,
      entrySource,
      foregroundGeneration,
      hip3ConfigVersion,
      mode,
      network,
      provider,
      symbol,
    ],
  );

  const endActiveSession = useCallback(
    ({
      success,
      reason,
      failureReason,
      missingSections,
      hasSectionError,
    }: EndSessionOptions) => {
      const session = activeSessionRef.current;
      if (!session) {
        return;
      }

      clearTimeout(session.timeout);
      endTrace({
        name: TraceName.PerpsMarketDetailSession,
        id: session.id,
        data: {
          success,
          ...(hasSectionError ? { has_section_error: true } : {}),
          ...(reason || failureReason
            ? { reason: reason ?? failureReason }
            : {}),
          ...(missingSections?.length
            ? { missing_sections: missingSections.join(',') }
            : {}),
        },
      });
      DevLogger.log(
        `${PROOF_MARKER} ${JSON.stringify({
          stage: reason
            ? 'detail_session_cancelled'
            : 'detail_session_completed',
          session_id: session.id,
          mode: session.mode,
          symbol: session.symbol,
          success,
          ...(hasSectionError ? { has_section_error: true } : {}),
          ...(reason || failureReason
            ? { reason: reason ?? failureReason }
            : {}),
          section_offsets_ms: roundedOffsets(session.sectionOffsetsMs),
          section_states: session.sectionStates,
          ...(missingSections?.length
            ? { missing_sections: missingSections }
            : {}),
        })}`,
      );
      activeSessionRef.current = null;
      setIsSessionActive(false);
    },
    [],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const previousState = appStateRef.current;
      appStateRef.current = nextState;

      if (nextState !== 'active') {
        endActiveSession({ success: false, reason: 'app_backgrounded' });
        return;
      }
      if (previousState !== 'active') {
        setForegroundGeneration((generation) => generation + 1);
      }
    });
    return () => subscription.remove();
  }, [endActiveSession]);

  useLayoutEffect(() => {
    if (!symbol) {
      if (activeSessionRef.current) {
        endActiveSession({ success: false, reason: 'generation_changed' });
      }
      return;
    }
    if (AppState.currentState !== 'active') {
      return;
    }

    if (activeSessionRef.current) {
      endActiveSession({ success: false, reason: 'generation_changed' });
    }

    const currentGenerationIdentity = generationIdentityRef.current;
    if (!currentGenerationIdentity) {
      return;
    }
    previousGenerationRef.current = currentGenerationIdentity;
    activeGenerationTriggerRef.current = generationTrigger;

    const id = uuidv4();
    const startedAtMs = performance.now();
    const expectedSections = expectedSectionsKey
      .split('|')
      .filter(Boolean) as PerpsMarketDetailSection[];
    trace({
      name: TraceName.PerpsMarketDetailSession,
      id,
      op: TraceOperation.PerpsLoading,
      tags: buildPerpsCufStartTags({
        detail_mode: mode,
        provider: provider ?? 'unknown',
        network,
        chart_strategy: configuredChartLibrary,
        generation_trigger: generationTrigger,
      }),
      data: {
        symbol,
        chart_library: renderedChartLibraryRef.current,
        market_source: marketSourceRef.current,
        hip3_config_version: hip3ConfigVersion,
        ...(entrySource ? { entry_source: entrySource } : {}),
      },
    });

    const timeout = setTimeout(() => {
      const active = activeSessionRef.current;
      if (!active || active.id !== id) {
        return;
      }
      const missingSections = active.expectedSections.filter(
        (section) => !active.recordedSections.has(section),
      );
      endActiveSession({
        success: false,
        reason: 'detail_session_timeout',
        missingSections,
      });
    }, PERPS_LOADING_SESSION_TIMEOUT_MS);

    activeSessionRef.current = {
      id,
      mode,
      symbol,
      startedAtMs,
      expectedSections,
      recordedSections: new Set(),
      sectionOffsetsMs: {},
      sectionStates: {},
      requiresCandleFreshness: configuredChartLibrary === 'lightweight',
      ...(generationTrigger === 'background_resume'
        ? {
            deliveryBaselines: getStreamDeliveryRevisions(),
            connectionGenerationBaseline:
              PerpsConnectionManager.getConnectionGeneration(),
          }
        : {}),
      timeout,
    };
    setIsSessionActive(true);
    setSessionRevision((revision) => revision + 1);
    DevLogger.log(
      `${PROOF_MARKER} ${JSON.stringify({
        stage: 'detail_session_start',
        session_id: id,
        mode,
        symbol,
        monotonic_ms: Number(startedAtMs.toFixed(3)),
        generation_trigger: generationTrigger,
      })}`,
    );
  }, [
    address,
    configurationKey,
    configuredChartLibrary,
    endActiveSession,
    entrySource,
    expectedSectionsKey,
    foregroundGeneration,
    generationTrigger,
    hip3ConfigVersion,
    mode,
    network,
    provider,
    symbol,
  ]);

  useEffect(
    () => () => {
      endActiveSession({ success: false, reason: 'surface_unmounted' });
    },
    [endActiveSession],
  );

  useEffect(() => {
    const session = activeSessionRef.current;
    if (!session) {
      return;
    }
    annotateTraceByRequest(
      { name: TraceName.PerpsMarketDetailSession, id: session.id },
      { chart_library: renderedChartLibrary },
    );
  }, [renderedChartLibrary]);

  useEffect(() => {
    const session = activeSessionRef.current;
    if (!session) {
      return;
    }
    annotateTraceByRequest(
      { name: TraceName.PerpsMarketDetailSession, id: session.id },
      { market_source: marketSource },
    );
  }, [marketSource]);

  useEffect(() => {
    const session = activeSessionRef.current;
    if (
      !session ||
      appStateRef.current !== 'active' ||
      session.symbol !== symbol ||
      session.mode !== mode
    ) {
      return;
    }

    for (const section of session.expectedSections) {
      if (session.recordedSections.has(section)) {
        continue;
      }
      const state = sectionsRef.current[section] ?? 'loading';
      const isUserSection =
        section === PERPS_MARKET_DETAIL_SECTION.ACCOUNT ||
        section === PERPS_MARKET_DETAIL_SECTION.POSITIONS_ORDERS;
      if (
        state === 'loading' ||
        !isMarketContextReady ||
        (isUserSection && !isUserContextReady) ||
        !hasFreshSectionDelivery(
          section,
          session.deliveryBaselines,
          session.connectionGenerationBaseline,
          session.requiresCandleFreshness,
        )
      ) {
        continue;
      }

      session.recordedSections.add(section);
      session.sectionStates[section] = state;
      annotateTraceByRequest(
        { name: TraceName.PerpsMarketDetailSession, id: session.id },
        { [`${section}_state`]: state },
      );

      if (state !== 'not_applicable') {
        const elapsedMs = Number(
          Math.max(0, performance.now() - session.startedAtMs).toFixed(3),
        );
        session.sectionOffsetsMs[section] = elapsedMs;
        setTraceMeasurement(
          { name: TraceName.PerpsMarketDetailSession, id: session.id },
          SECTION_MEASUREMENTS[section],
          elapsedMs,
          'millisecond',
        );
        DevLogger.log(
          `${PROOF_MARKER} ${JSON.stringify({
            stage: 'detail_section_resolved',
            session_id: session.id,
            mode,
            symbol,
            section,
            state,
            elapsed_ms: elapsedMs,
          })}`,
        );
      }
    }

    if (
      session.expectedSections.every((section) =>
        session.recordedSections.has(section),
      )
    ) {
      const hasSectionError = Object.values(session.sectionStates).includes(
        'error',
      );
      endActiveSession({
        success: !hasSectionError,
        ...(hasSectionError ? { failureReason: 'section_error' } : {}),
        hasSectionError,
      });
    }
  }, [
    endActiveSession,
    isMarketContextReady,
    isUserContextReady,
    mode,
    sectionStatesKey,
    sessionRevision,
    streamDeliveryRevisionsKey,
    symbol,
  ]);

  return {
    generationTrigger,
    isActive: isSessionActive,
    liveResetKey,
  };
}
