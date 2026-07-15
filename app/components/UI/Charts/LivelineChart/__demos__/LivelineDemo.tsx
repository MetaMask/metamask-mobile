/**
 * Full-featured LivelineChart playground.
 *
 * Structured to mirror the upstream liveline dev demo so every prop can be
 * tested interactively. Three tabs: Line, Candle, Multi-series.
 *
 * Data design (matches upstream for smoothness):
 * Ticks arrive at a configurable rate (50ms–1s). The seed pre-fills ~700
 * points at 0.5s intervals so the visible window always has dense data and
 * the lerp stays fluid. Candle data is aggregated from the same tick stream.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { LivelineChart } from '..';
import type {
  LivelinePoint,
  CandlePoint,
  LivelineSeries,
  HoverPoint,
  OrderbookData,
} from '../LivelineChart.types';
import { useTheme } from 'app/util/theme';

// ─── Constants ──────────────────────────────────────────────────────────────

const CHART_HEIGHT = 300;
const MAX_TICKS = 2000;
const SEED_COUNT = 700;
const SEED_INTERVAL_S = 0.5;

const TIME_WINDOWS = [
  { label: '10s', secs: 10 },
  { label: '30s', secs: 30 },
  { label: '1m', secs: 60 },
  { label: '5m', secs: 300 },
];

const TICK_RATES = [
  { label: '50ms', ms: 50 },
  { label: '100ms', ms: 100 },
  { label: '300ms', ms: 300 },
  { label: '1s', ms: 1000 },
];

const VOLATILITIES = ['calm', 'normal', 'spiky', 'chaos'] as const;
type Volatility = (typeof VOLATILITIES)[number];

const VOLATILITY_SCALE: Record<Volatility, number> = {
  calm: 0.15,
  normal: 0.8,
  spiky: 3,
  chaos: 8,
};
const VOLATILITY_BIAS: Record<Volatility, number> = {
  calm: 0.49,
  normal: 0.48,
  spiky: 0.47,
  chaos: 0.45,
};

const CANDLE_WIDTHS = [
  { label: '1s', secs: 1 },
  { label: '2s', secs: 2 },
  { label: '5s', secs: 5 },
  { label: '10s', secs: 10 },
];

// ─── Data helpers ────────────────────────────────────────────────────────────

const nowSec = () => Date.now() / 1000;

function nextTick(prev: number, time: number, vol: Volatility): LivelinePoint {
  const scale = VOLATILITY_SCALE[vol];
  const bias = VOLATILITY_BIAS[vol];
  const spike =
    (vol === 'spiky' || vol === 'chaos') && Math.random() < 0.08
      ? (Math.random() - 0.5) * scale * 3
      : 0;
  return { time, value: prev + (Math.random() - bias) * scale + spike };
}

function seedTicks(vol: Volatility): LivelinePoint[] {
  const t = nowSec();
  const pts: LivelinePoint[] = [];
  let v = 100;
  for (let i = SEED_COUNT; i >= 0; i--) {
    const pt = nextTick(v, t - i * SEED_INTERVAL_S, vol);
    pts.push(pt);
    v = pt.value;
  }
  return pts;
}

/** Aggregate a tick array into OHLC candles + a live (partial) candle. */
function aggregateCandles(
  ticks: LivelinePoint[],
  widthSecs: number,
): { candles: CandlePoint[]; live: CandlePoint | null } {
  if (!ticks.length) return { candles: [], live: null };
  const out: CandlePoint[] = [];
  let slot = Math.floor(ticks[0].time / widthSecs) * widthSecs;
  let o = ticks[0].value,
    h = o,
    l = o,
    c = o;
  for (let i = 1; i < ticks.length; i++) {
    const t = ticks[i];
    if (t.time >= slot + widthSecs) {
      out.push({ time: slot, open: o, high: h, low: l, close: c });
      slot = Math.floor(t.time / widthSecs) * widthSecs;
      o = t.value;
      h = o;
      l = o;
      c = o;
    } else {
      c = t.value;
      if (c > h) h = c;
      if (c < l) l = c;
    }
  }
  return {
    candles: out,
    live: { time: slot, open: o, high: h, low: l, close: c },
  };
}

/** Yes / No prediction series seeded from a tick run, always summing to 100. */
function seedYesNoSeries(tickCount = SEED_COUNT): LivelineSeries[] {
  const t = nowSec();
  const yesData: LivelinePoint[] = [];
  let yes = 50;
  for (let i = tickCount; i >= 0; i--) {
    yes = Math.max(5, Math.min(95, yes + (Math.random() - 0.5) * 1.5));
    yesData.push({ time: t - i * SEED_INTERVAL_S, value: yes });
  }
  const noData = yesData.map((p) => ({ time: p.time, value: 100 - p.value }));
  return [
    {
      id: 'yes',
      data: yesData,
      value: yesData[yesData.length - 1].value,
      color: 'rgb(34,197,94)',
      label: 'Yes',
    },
    {
      id: 'no',
      data: noData,
      value: noData[noData.length - 1].value,
      color: 'rgb(239,68,68)',
      label: 'No',
    },
  ];
}

/** Fake orderbook data. */
function makeOrderbook(): OrderbookData {
  const side = (base: number) =>
    Array.from({ length: 6 }, (_, i) => [
      +(base + (Math.random() - 0.5) * 5 + i * 2).toFixed(2),
      +(Math.random() * 200 + 20).toFixed(0),
    ]) as [number, number][];
  return { bids: side(99), asks: side(101) };
}

// ─── Micro UI components ─────────────────────────────────────────────────────

const Btn: React.FC<{
  label: string;
  active?: boolean;
  onPress: () => void;
}> = ({ label, active = false, onPress }) => {
  const tw = useTailwind();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) =>
        tw.style(
          'px-2.5 py-1 rounded mr-1.5 mb-1.5',
          active ? 'bg-primary-default' : 'bg-background-alternative',
          pressed && 'opacity-60',
        )
      }
    >
      <Text
        variant={TextVariant.BodyXs}
        fontWeight={FontWeight.Medium}
        twClassName={active ? 'text-primary-inverse' : 'text-text-alternative'}
      >
        {label}
      </Text>
    </Pressable>
  );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <Box twClassName="mb-2">
    <Text
      variant={TextVariant.BodyXs}
      twClassName="text-text-muted uppercase mb-1 tracking-widest"
    >
      {label}
    </Text>
    <Box flexDirection={BoxFlexDirection.Row} twClassName="flex-wrap">
      {children}
    </Box>
  </Box>
);

// ─── Main demo ───────────────────────────────────────────────────────────────

type Tab = 'line' | 'candle' | 'multi';
type Scenario = 'live' | 'loading' | 'hold' | 'empty';

const LivelineDemo: React.FC = () => {
  const tw = useTailwind();
  const { colors } = useTheme();

  // ── Tab ──
  const [tab, setTab] = useState<Tab>('line');

  // ── Shared stream state ──
  const [ticks, setTicks] = useState<LivelinePoint[]>([]);
  const [value, setValue] = useState(100);
  const lastValRef = useRef(100);
  const ticksRef = useRef<LivelinePoint[]>([]);

  // ── Controls ──
  const [scenario, setScenario] = useState<Scenario>('live');
  const [volatility, setVolatility] = useState<Volatility>('normal');
  const [tickRateMs, setTickRateMs] = useState(300);
  const [windowSecs, setWindowSecs] = useState(30);
  const volatilityRef = useRef(volatility);
  volatilityRef.current = volatility;

  // ── Visual feature toggles ──
  const [grid, setGrid] = useState(true);
  const [fill, setFill] = useState(true);
  const [badge, setBadge] = useState(true);
  const [badgeTail, setBadgeTail] = useState(true);
  const [badgeVariant, setBadgeVariant] = useState<'default' | 'minimal'>(
    'default',
  );
  const [momentum, setMomentum] = useState(true);
  const [pulse, setPulse] = useState(true);
  const [scrub, setScrub] = useState(true);
  const [exaggerate, setExaggerate] = useState(false);
  const [showValue, setShowValue] = useState(false);
  const [valueMomentumColor, setValueMomentumColor] = useState(false);
  const [degen, setDegen] = useState(false);
  const [degenScale, setDegenScale] = useState(1);
  const [degenDown, setDegenDown] = useState(false);
  const [windowStyle, setWindowStyle] = useState<
    'default' | 'rounded' | 'text'
  >('rounded');

  // ── Reference line ──
  const [showRef, setShowRef] = useState(false);
  const refValue = 100;

  // ── Orderbook ──
  const [showOrderbook, setShowOrderbook] = useState(false);
  const [orderbook, setOrderbook] = useState<OrderbookData>(makeOrderbook);

  // ── Candle controls ──
  const [candleWidthSecs, setCandleWidthSecs] = useState(2);
  const [candles, setCandles] = useState<CandlePoint[]>([]);
  const [liveCandle, setLiveCandle] = useState<CandlePoint | null>(null);
  const liveCandleRef = useRef<CandlePoint | null>(null);
  const candleWidthRef = useRef(candleWidthSecs);
  candleWidthRef.current = candleWidthSecs;
  const [lineMode, setLineMode] = useState(false);

  // ── Multi-series (Yes / No) ──
  const [series, setSeries] = useState<LivelineSeries[]>(() =>
    seedYesNoSeries(),
  );

  // ── Hover ──
  const [hoverPoint, setHoverPoint] = useState<HoverPoint | null>(null);

  // ─── Candle aggregation on width change ─────────────────────────────────
  useEffect(() => {
    if (!ticksRef.current.length) return;
    const { candles: c, live } = aggregateCandles(
      ticksRef.current,
      candleWidthSecs,
    );
    setCandles(c);
    setLiveCandle(live);
    liveCandleRef.current = live;
  }, [candleWidthSecs]);

  // ── Tick a new candle point ──────────────────────────────────────────────
  const tickCandle = useCallback((pt: LivelinePoint) => {
    const width = candleWidthRef.current;
    const lc = liveCandleRef.current;
    if (!lc) {
      const slot = Math.floor(pt.time / width) * width;
      const fresh = {
        time: slot,
        open: pt.value,
        high: pt.value,
        low: pt.value,
        close: pt.value,
      };
      liveCandleRef.current = fresh;
      setLiveCandle({ ...fresh });
      return;
    }
    if (pt.time >= lc.time + width) {
      // Close current and start new
      const closed = { ...lc };
      setCandles((prev) => {
        const next = [...prev, closed];
        return next.length > MAX_TICKS ? next.slice(-MAX_TICKS) : next;
      });
      const slot = Math.floor(pt.time / width) * width;
      const fresh = {
        time: slot,
        open: pt.value,
        high: pt.value,
        low: pt.value,
        close: pt.value,
      };
      liveCandleRef.current = fresh;
      setLiveCandle({ ...fresh });
    } else {
      lc.close = pt.value;
      if (pt.value > lc.high) lc.high = pt.value;
      if (pt.value < lc.low) lc.low = pt.value;
      setLiveCandle({ ...lc });
    }
  }, []);

  // ─── Start live stream ───────────────────────────────────────────────────
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startLive = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    const seed = seedTicks(volatilityRef.current);
    ticksRef.current = seed;
    const last = seed[seed.length - 1].value;
    lastValRef.current = last;
    setTicks(seed);
    setValue(last);

    const { candles: c, live } = aggregateCandles(seed, candleWidthRef.current);
    setCandles(c);
    setLiveCandle(live);
    liveCandleRef.current = live;

    intervalRef.current = setInterval(() => {
      const now = nowSec();
      const pt = nextTick(lastValRef.current, now, volatilityRef.current);
      lastValRef.current = pt.value;
      setValue(pt.value);
      setTicks((prev) => {
        const next = [...prev, pt];
        const trimmed = next.length > MAX_TICKS ? next.slice(-MAX_TICKS) : next;
        ticksRef.current = trimmed;
        return trimmed;
      });
      tickCandle(pt);

      // Tick Yes / No series
      setSeries((prev) => {
        const yes = prev[0];
        const nextYes = Math.max(
          5,
          Math.min(95, yes.value + (Math.random() - 0.5) * 1.5),
        );
        const nextNo = 100 - nextYes;
        return [
          {
            ...yes,
            data: [
              ...yes.data.slice(-MAX_TICKS),
              { time: now, value: nextYes },
            ],
            value: nextYes,
          },
          {
            ...prev[1],
            data: [
              ...prev[1].data.slice(-MAX_TICKS),
              { time: now, value: nextNo },
            ],
            value: nextNo,
          },
        ];
      });

      // Drift orderbook
      if (Math.random() < 0.3) {
        setOrderbook(makeOrderbook());
      }
    }, tickRateMs);
  }, [tickRateMs, tickCandle]);

  // ─── Scenario effect ─────────────────────────────────────────────────────
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (scenario === 'live') {
      startLive();
    } else {
      setTicks([]);
      ticksRef.current = [];
      setCandles([]);
      setLiveCandle(null);
      liveCandleRef.current = null;
      setValue(100);
      lastValRef.current = 100;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [scenario, startLive]);

  // ─── Restart interval when tick rate changes while live ──────────────────
  useEffect(() => {
    if (scenario !== 'live') return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      const now = nowSec();
      const pt = nextTick(lastValRef.current, now, volatilityRef.current);
      lastValRef.current = pt.value;
      setValue(pt.value);
      setTicks((prev) => {
        const next = [...prev, pt];
        const trimmed = next.length > MAX_TICKS ? next.slice(-MAX_TICKS) : next;
        ticksRef.current = trimmed;
        return trimmed;
      });
      tickCandle(pt);
      setSeries((prev) => {
        const yes = prev[0];
        const nextYes = Math.max(
          5,
          Math.min(95, yes.value + (Math.random() - 0.5) * 1.5),
        );
        const nextNo = 100 - nextYes;
        return [
          {
            ...yes,
            data: [
              ...yes.data.slice(-MAX_TICKS),
              { time: now, value: nextYes },
            ],
            value: nextYes,
          },
          {
            ...prev[1],
            data: [
              ...prev[1].data.slice(-MAX_TICKS),
              { time: now, value: nextNo },
            ],
            value: nextNo,
          },
        ];
      });
      if (Math.random() < 0.3) setOrderbook(makeOrderbook());
    }, tickRateMs);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tickRateMs, scenario, tickCandle]);

  const isLoading = scenario === 'loading' || scenario === 'hold';
  const isPaused = scenario === 'hold';
  const degenProp = degen
    ? { scale: degenScale, downMomentum: degenDown }
    : false;

  // ─── Shared chart props for line / candle ────────────────────────────────
  const sharedProps = {
    data: ticks,
    value,
    loading: isLoading,
    paused: isPaused,
    grid,
    fill,
    badge,
    badgeTail,
    badgeVariant,
    momentum,
    pulse,
    scrub,
    exaggerate,
    showValue,
    valueMomentumColor,
    degen: degenProp,
    window: windowSecs,
    windows: TIME_WINDOWS,
    onWindowChange: setWindowSecs,
    windowStyle,
    referenceLine: showRef
      ? { value: Number(refValue), label: 'Target' }
      : undefined,
    orderbook: showOrderbook ? orderbook : undefined,
    onHover: setHoverPoint,
    height: CHART_HEIGHT,
    formatValue: 'return v.toFixed(2)',
    onChartReady: undefined as (() => void) | undefined,
  } as const;

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <ScrollView style={tw.style('flex-1 bg-background-default')}>
      {/* Header */}
      <Box twClassName="pt-12 px-4 pb-3">
        <Text variant={TextVariant.HeadingMd} twClassName="text-text-default">
          LivelineChart Playground
        </Text>
        <Text variant={TextVariant.BodyXs} twClassName="text-text-muted mt-0.5">
          {ticks.length} ticks · value: {value.toFixed(2)} · window:{' '}
          {windowSecs}s
        </Text>
      </Box>

      {/* Tab switcher */}
      <Box flexDirection={BoxFlexDirection.Row} twClassName="px-4 mb-3 gap-2">
        {(['line', 'candle', 'multi'] as Tab[]).map((t) => (
          <Btn key={t} label={t} active={tab === t} onPress={() => setTab(t)} />
        ))}
      </Box>

      {/* ── Controls ── */}
      <Box twClassName="px-4">
        {/* State */}
        <Row label="State">
          <Btn
            label="Live"
            active={scenario === 'live'}
            onPress={() => setScenario('live')}
          />
          <Btn
            label="Loading→Live"
            active={scenario === 'loading'}
            onPress={() => setScenario('loading')}
          />
          <Btn
            label="Loading"
            active={scenario === 'hold'}
            onPress={() => setScenario('hold')}
          />
          <Btn
            label="Empty"
            active={scenario === 'empty'}
            onPress={() => setScenario('empty')}
          />
        </Row>

        {/* Data */}
        <Row label="Volatility">
          {VOLATILITIES.map((v) => (
            <Btn
              key={v}
              label={v}
              active={volatility === v}
              onPress={() => setVolatility(v)}
            />
          ))}
        </Row>
        <Row label="Tick rate">
          {TICK_RATES.map((r) => (
            <Btn
              key={r.ms}
              label={r.label}
              active={tickRateMs === r.ms}
              onPress={() => setTickRateMs(r.ms)}
            />
          ))}
        </Row>

        {/* Features */}
        <Row label="Features">
          <Btn
            label={`Grid ${grid ? '✓' : ''}`}
            active={grid}
            onPress={() => setGrid((v) => !v)}
          />
          <Btn
            label={`Fill ${fill ? '✓' : ''}`}
            active={fill}
            onPress={() => setFill((v) => !v)}
          />
          <Btn
            label={`Badge ${badge ? '✓' : ''}`}
            active={badge}
            onPress={() => setBadge((v) => !v)}
          />
          <Btn
            label={`Tail ${badgeTail ? '✓' : ''}`}
            active={badgeTail}
            onPress={() => setBadgeTail((v) => !v)}
          />
          <Btn
            label={`Momentum ${momentum ? '✓' : ''}`}
            active={momentum}
            onPress={() => setMomentum((v) => !v)}
          />
          <Btn
            label={`Pulse ${pulse ? '✓' : ''}`}
            active={pulse}
            onPress={() => setPulse((v) => !v)}
          />
          <Btn
            label={`Scrub ${scrub ? '✓' : ''}`}
            active={scrub}
            onPress={() => setScrub((v) => !v)}
          />
          <Btn
            label={`Exaggerate ${exaggerate ? '✓' : ''}`}
            active={exaggerate}
            onPress={() => setExaggerate((v) => !v)}
          />
          <Btn
            label={`ShowValue ${showValue ? '✓' : ''}`}
            active={showValue}
            onPress={() => setShowValue((v) => !v)}
          />
          <Btn
            label={`ValColor ${valueMomentumColor ? '✓' : ''}`}
            active={valueMomentumColor}
            onPress={() => setValueMomentumColor((v) => !v)}
          />
          <Btn
            label={`RefLine ${showRef ? '✓' : ''}`}
            active={showRef}
            onPress={() => setShowRef((v) => !v)}
          />
          <Btn
            label={`Orderbook ${showOrderbook ? '✓' : ''}`}
            active={showOrderbook}
            onPress={() => setShowOrderbook((v) => !v)}
          />
        </Row>

        {/* Badge variant */}
        <Row label="Badge style">
          <Btn
            label="Default"
            active={badgeVariant === 'default'}
            onPress={() => setBadgeVariant('default')}
          />
          <Btn
            label="Minimal"
            active={badgeVariant === 'minimal'}
            onPress={() => setBadgeVariant('minimal')}
          />
        </Row>

        {/* Window style */}
        <Row label="Window style">
          <Btn
            label="Default"
            active={windowStyle === 'default'}
            onPress={() => setWindowStyle('default')}
          />
          <Btn
            label="Rounded"
            active={windowStyle === 'rounded'}
            onPress={() => setWindowStyle('rounded')}
          />
          <Btn
            label="Text"
            active={windowStyle === 'text'}
            onPress={() => setWindowStyle('text')}
          />
        </Row>

        {/* Degen */}
        <Row label="Degen">
          <Btn
            label={`Enable ${degen ? '✓' : ''}`}
            active={degen}
            onPress={() => setDegen((v) => !v)}
          />
          {degen && (
            <>
              <Btn
                label={`DownMom ${degenDown ? '✓' : ''}`}
                active={degenDown}
                onPress={() => setDegenDown((v) => !v)}
              />
              {[0.5, 1, 2, 4].map((s) => (
                <Btn
                  key={s}
                  label={`${s}x`}
                  active={degenScale === s}
                  onPress={() => setDegenScale(s)}
                />
              ))}
            </>
          )}
        </Row>

        {/* Candle-specific controls */}
        {tab === 'candle' && (
          <>
            <Row label="Candle width">
              {CANDLE_WIDTHS.map((w) => (
                <Btn
                  key={w.secs}
                  label={w.label}
                  active={candleWidthSecs === w.secs}
                  onPress={() => setCandleWidthSecs(w.secs)}
                />
              ))}
            </Row>
            <Row label="Mode">
              <Btn
                label="Candle"
                active={!lineMode}
                onPress={() => setLineMode(false)}
              />
              <Btn
                label="Line overlay"
                active={lineMode}
                onPress={() => setLineMode(true)}
              />
            </Row>
          </>
        )}
      </Box>

      {/* ── Chart ── */}
      <Box twClassName="mx-4 rounded-xl overflow-hidden">
        {tab === 'line' && (
          <LivelineChart
            {...sharedProps}
            lineWidth={2}
            color={colors.warning.default}
            emptyText="No data yet"
          />
        )}
        {tab === 'candle' && (
          <LivelineChart
            {...sharedProps}
            mode="candle"
            candles={candles}
            candleWidth={candleWidthSecs}
            liveCandle={liveCandle ?? undefined}
            lineMode={lineMode}
            lineData={ticks}
            lineValue={value}
          />
        )}
        {tab === 'multi' && (
          <LivelineChart
            data={ticks}
            value={value}
            series={series}
            loading={isLoading}
            paused={isPaused}
            grid={grid}
            scrub={scrub}
            pulse={pulse}
            exaggerate={exaggerate}
            referenceLine={showRef ? { value: 50, label: '50%' } : undefined}
            window={windowSecs}
            windows={TIME_WINDOWS}
            onWindowChange={setWindowSecs}
            windowStyle={windowStyle}
            onHover={setHoverPoint}
            height={CHART_HEIGHT}
            formatValue="return v.toFixed(1) + '%'"
          />
        )}
      </Box>

      {/* ── Hover / status bar ── */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        twClassName="px-4 pt-1.5 pb-2"
      >
        <Text variant={TextVariant.BodyXs} twClassName="text-text-muted">
          {hoverPoint
            ? `t=${new Date(hoverPoint.time * 1000).toLocaleTimeString()} v=${hoverPoint.value.toFixed(2)}`
            : 'Hover over chart'}
        </Text>
        {tab === 'multi' && series.length >= 2 && (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-3"
          >
            <Text
              variant={TextVariant.BodyXs}
              twClassName="text-success-default"
            >
              Yes {series[0].value.toFixed(1)}%
            </Text>
            <Text variant={TextVariant.BodyXs} twClassName="text-error-default">
              No {series[1].value.toFixed(1)}%
            </Text>
          </Box>
        )}
      </Box>

      <Box twClassName="pb-16" />
    </ScrollView>
  );
};

LivelineDemo.displayName = 'LivelineDemo';

// eslint-disable-next-line import-x/no-default-export
export default LivelineDemo;
