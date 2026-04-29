/**
 * Dev-only on-device benchmark: BN.js vs native BigInt.
 *
 * Runs the same hot-path workloads we ship in
 * `.agent/hermes-benchmark.src.js` directly inside the app on Hermes, so we
 * see the actual numbers a real iOS / Android device produces. This file is
 * intentionally self-contained — delete it (and its line in
 * `DeveloperOptions/index.tsx`) to remove the screen entirely.
 */
import React, { useCallback, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import BN from 'bnjs5';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  Button,
  ButtonVariant,
  ButtonSize,
} from '@metamask/design-system-react-native';

// ---------------- workloads (mirror of .agent/hermes-benchmark.src.js) ----

const HEX_BAL = '0xde0b6b3a7640000'; // 1 ETH
const HEX_STAKED = '0x6f05b59d3b20000'; // 0.5 ETH
const HEX_BIG = '0x56bc75e2d63100000'; // 100 ETH
const HEX_SMALL = '0x539'; // 1337 wei

const A_BN = new BN(HEX_BAL.slice(2), 16);
const B_BN = new BN(HEX_STAKED.slice(2), 16);
const A_BI = BigInt(HEX_BAL);
const B_BI = BigInt(HEX_STAKED);
const RATE_BN = new BN('1000000000000000000');
const RATE_BI = 1000000000000000000n;

interface Workload {
  name: string;
  /** What runs each iteration (for screenshots / reviewers). */
  bnCalls: string;
  biCalls: string;
  bn: () => void;
  bi: () => void;
}

/** Sink so workload bodies stay as real computations without tripping lint rules. */
function bench<T>(_value: T): void {
  // Intentionally empty.
}

const WORKLOADS: Workload[] = [
  {
    name: 'Hex parse',
    bnCalls: `new BN(HEX_BAL.slice(2), 16)
new BN(HEX_STAKED.slice(2), 16)
new BN(HEX_BIG.slice(2), 16)
new BN(HEX_SMALL.slice(2), 16)`,
    biCalls: `BigInt(HEX_BAL)
BigInt(HEX_STAKED)
BigInt(HEX_BIG)
BigInt(HEX_SMALL)`,
    bn: () => {
      bench(new BN(HEX_BAL.slice(2), 16));
      bench(new BN(HEX_STAKED.slice(2), 16));
      bench(new BN(HEX_BIG.slice(2), 16));
      bench(new BN(HEX_SMALL.slice(2), 16));
    },
    bi: () => {
      bench(BigInt(HEX_BAL));
      bench(BigInt(HEX_STAKED));
      bench(BigInt(HEX_BIG));
      bench(BigInt(HEX_SMALL));
    },
  },
  {
    name: 'Addition',
    bnCalls: 'A_BN.add(B_BN)',
    biCalls: 'A_BI + B_BI',
    bn: () => {
      bench(A_BN.add(B_BN));
    },
    bi: () => {
      bench(A_BI + B_BI);
    },
  },
  {
    name: 'Multiplication',
    bnCalls: 'A_BN.mul(RATE_BN)',
    biCalls: 'A_BI * RATE_BI',
    bn: () => {
      bench(A_BN.mul(RATE_BN));
    },
    bi: () => {
      bench(A_BI * RATE_BI);
    },
  },
  {
    name: 'Comparison',
    bnCalls: `A_BN.gt(B_BN)
A_BN.eq(B_BN)
A_BN.isZero()`,
    biCalls: `A_BI > B_BI
A_BI === B_BI
A_BI === 0n`,
    bn: () => {
      bench(A_BN.gt(B_BN));
      bench(A_BN.eq(B_BN));
      bench(A_BN.isZero());
    },
    bi: () => {
      bench(A_BI > B_BI);
      bench(A_BI === B_BI);
      bench(A_BI === 0n);
    },
  },
  {
    name: 'Hex serialize',
    bnCalls: '`0x${A_BN.toString(16)}`',
    biCalls: '`0x${A_BI.toString(16)}`',
    bn: () => {
      bench(`0x${A_BN.toString(16)}`);
    },
    bi: () => {
      bench(`0x${A_BI.toString(16)}`);
    },
  },
  {
    name: 'Balance pipeline',
    bnCalls: `bal = new BN(HEX_BAL.slice(2), 16)
staked = new BN(HEX_STAKED.slice(2), 16)
total = bal.add(staked)
\`0x\${total.toString(16)}\``,
    biCalls: `bal = BigInt(HEX_BAL)
staked = BigInt(HEX_STAKED)
total = bal + staked
\`0x\${total.toString(16)}\``,
    bn: () => {
      const bal = new BN(HEX_BAL.slice(2), 16);
      const staked = new BN(HEX_STAKED.slice(2), 16);
      const total = bal.add(staked);
      bench(`0x${total.toString(16)}`);
    },
    bi: () => {
      const bal = BigInt(HEX_BAL);
      const staked = BigInt(HEX_STAKED);
      const total = bal + staked;
      bench(`0x${total.toString(16)}`);
    },
  },
];

// ---------------- timing ----------------

// Reduced from the CLI script's 200k because phones are 5-10x slower than
// a laptop; 50k still gives ≥10ms BN trials on a mid-tier Android, which is
// well above timer noise.
const ITERS = 50000;
const TRIALS = 5;

const now = (): number =>
  typeof performance !== 'undefined' && performance.now
    ? performance.now()
    : Date.now();

const yieldToUi = () => new Promise<void>((r) => setTimeout(r, 0));

const runTrial = (fn: () => void, iters: number): number => {
  const t0 = now();
  for (let i = 0; i < iters; i++) fn();
  return now() - t0;
};

const stats = (samples: number[]) => {
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length;
  const v = samples.reduce((a, b) => a + (b - mean) ** 2, 0) / samples.length;
  return { mean, stddev: Math.sqrt(v) };
};

interface Result {
  name: string;
  bnCalls: string;
  biCalls: string;
  bn: { mean: number; stddev: number };
  bi: { mean: number; stddev: number };
}

// ---------------- component ----------------

const fmt = (n: number) => n.toFixed(n < 10 ? 2 : 1);

const ResultRow: React.FC<{ r: Result; widest: number }> = ({ r, widest }) => {
  const speedup = r.bn.mean / r.bi.mean;
  const bnPct = (r.bn.mean / widest) * 100;
  const biPct = (r.bi.mean / widest) * 100;
  return (
    <Box twClassName="py-2 border-b border-muted">
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        alignItems={BoxAlignItems.Center}
        twClassName="mb-1"
      >
        <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
          {r.name}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
          color={
            speedup >= 1 ? TextColor.SuccessDefault : TextColor.ErrorDefault
          }
        >
          {speedup.toFixed(2)}× {speedup >= 1 ? 'faster' : 'slower'}
        </Text>
      </Box>

      <Box
        twClassName="mb-2 rounded-md bg-muted p-2 gap-2"
        flexDirection={BoxFlexDirection.Column}
      >
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          Per iteration (this loop runs {ITERS.toLocaleString()}× per timed
          trial):
        </Text>
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextDefault}
          twClassName="font-mono leading-snug"
        >
          {'BN.js:\n'}
          {r.bnCalls}
        </Text>
        <Text
          variant={TextVariant.BodyXs}
          color={TextColor.TextDefault}
          twClassName="font-mono leading-snug"
        >
          {'BigInt:\n'}
          {r.biCalls}
        </Text>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2 mb-1"
      >
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="w-12"
        >
          BN.js
        </Text>
        <Box twClassName="flex-1 h-3 bg-muted rounded-sm overflow-hidden">
          <Box
            twClassName="h-full bg-warning-default"
            style={{ width: `${bnPct}%` }}
          />
        </Box>
        <Text variant={TextVariant.BodySm} twClassName="w-28 text-right">
          {fmt(r.bn.mean)} ± {fmt(r.bn.stddev)} ms
        </Text>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
      >
        <Text
          variant={TextVariant.BodySm}
          color={TextColor.TextAlternative}
          twClassName="w-12"
        >
          BigInt
        </Text>
        <Box twClassName="flex-1 h-3 bg-muted rounded-sm overflow-hidden">
          <Box
            twClassName="h-full bg-success-default"
            style={{ width: `${biPct}%` }}
          />
        </Box>
        <Text variant={TextVariant.BodySm} twClassName="w-28 text-right">
          {fmt(r.bi.mean)} ± {fmt(r.bi.stddev)} ms
        </Text>
      </Box>
    </Box>
  );
};

export default function BigIntBenchmark() {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [results, setResults] = useState<Result[]>([]);

  const run = useCallback(async () => {
    setRunning(true);
    setResults([]);
    const out: Result[] = [];

    for (let i = 0; i < WORKLOADS.length; i++) {
      const w = WORKLOADS[i];
      setProgress(`${i + 1}/${WORKLOADS.length}: ${w.name}`);
      await yieldToUi();

      runTrial(w.bn, Math.min(ITERS, 5000));
      runTrial(w.bi, Math.min(ITERS, 5000));
      await yieldToUi();

      const bnSamples: number[] = [];
      const biSamples: number[] = [];
      for (let t = 0; t < TRIALS; t++) {
        if (t % 2 === 0) {
          bnSamples.push(runTrial(w.bn, ITERS));
          await yieldToUi();
          biSamples.push(runTrial(w.bi, ITERS));
          await yieldToUi();
        } else {
          biSamples.push(runTrial(w.bi, ITERS));
          await yieldToUi();
          bnSamples.push(runTrial(w.bn, ITERS));
          await yieldToUi();
        }
      }
      out.push({
        name: w.name,
        bnCalls: w.bnCalls,
        biCalls: w.biCalls,
        bn: stats(bnSamples),
        bi: stats(biSamples),
      });
      setResults([...out]);
    }

    setProgress('done');
    setRunning(false);
  }, []);

  const widest =
    results.length > 0
      ? Math.max(...results.flatMap((r) => [r.bn.mean, r.bi.mean]))
      : 1;
  const pipeline = results.find((r) => r.name === 'Balance pipeline');

  return (
    <Box twClassName="my-4">
      <Text variant={TextVariant.HeadingLg} twClassName="mb-1">
        BN.js vs BigInt
      </Text>
      <Text
        variant={TextVariant.BodySm}
        color={TextColor.TextAlternative}
        twClassName="mb-3"
      >
        On-device microbenchmark · {ITERS.toLocaleString()} iters × {TRIALS}{' '}
        trials per workload.
      </Text>

      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        onPress={run}
        isFullWidth
        isDisabled={running}
      >
        {running ? 'Running…' : 'Run benchmark'}
      </Button>

      {running && (
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2 mt-3"
        >
          <ActivityIndicator size="small" />
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {progress}
          </Text>
        </Box>
      )}

      {pipeline && (
        <Box twClassName="mt-4 p-3 rounded-md bg-muted">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            End-to-end balance pipeline
          </Text>
          <Text
            variant={TextVariant.HeadingLg}
            color={TextColor.SuccessDefault}
            fontWeight={FontWeight.Bold}
          >
            {(pipeline.bn.mean / pipeline.bi.mean).toFixed(2)}× faster
          </Text>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            BN.js {fmt(pipeline.bn.mean)} ms · BigInt {fmt(pipeline.bi.mean)} ms
          </Text>
          <Text
            variant={TextVariant.BodyXs}
            color={TextColor.TextDefault}
            twClassName="mt-2 font-mono leading-snug"
          >
            {'BN.js:\n'}
            {pipeline.bnCalls}
            {'\n\nBigInt:\n'}
            {pipeline.biCalls}
          </Text>
        </Box>
      )}

      {results.length > 0 && (
        <Box twClassName="mt-3">
          {results.map((r) => (
            <ResultRow key={r.name} r={r} widest={widest} />
          ))}
        </Box>
      )}
    </Box>
  );
}
