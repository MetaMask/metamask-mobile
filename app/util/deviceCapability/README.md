# Device capability

Shared classification of how constrained the current device is. No Redux, no service, no saga, no cache.

## Public API

**Hardware** (sync, any JS context):

```ts
import { getHardwareTier } from '../../util/deviceCapability';

const tier = getHardwareTier(); // 'LOW' | 'MID' | 'HIGH' | null
```

One `DeviceInfo.getTotalMemorySync()` read. Uncached. RAM is static for the process, so this is a function, not a hook. Any `Platform.OS` other than `ios` uses Android bands.

**Network** (React only):

```ts
import { useNetworkTier } from '../../hooks/useNetworkTier';

const tier = useNetworkTier(); // 'NONE' | 'SLOW_CELLULAR' | 'FAST_CELLULAR' | 'WIFI' | null
```

For flows that must distinguish NetInfo's initial loading state from a
resolved but unclassified transport, use `useNetworkTierState()`:

```ts
import { useNetworkTierState } from '../../hooks/useNetworkTier';

const { tier, isResolved } = useNetworkTierState();
```

`isResolved` is `false` only while NetInfo still reports its initial
`unknown` state. It describes NetInfo only. A resolved `null` tier remains an unknown cohort.

Maps `useNetInfo()` in the calling component. No extra NetInfo listener. Network changes, so this is a hook, not `getNetworkTier()`.

**Transport tier** (`tier`) comes from NetInfo only and is never changed by measured latency: 2g / 3g are `SLOW_CELLULAR`, `wifi` / `ethernet` are `WIFI`, 4g / 5g are `FAST_CELLULAR`.

**Measured latency** is a separate hook, `useNetworkLatency()` (`'UNKNOWN' | 'OK' | 'SLOW'`):

```ts
import { useNetworkLatency } from '../../hooks/useNetworkLatency';

const latency = useNetworkLatency(); // 'UNKNOWN' | 'OK' | 'SLOW'
```

It comes from the newest in-memory samples over production `global.fetch` (`app/core/NitroFetchSetup.ts`, `latencyStore.ts`). The newest five decide. `SLOW` is entered when two of those calls pass the hardware row's `hungMs`, or when at least three calls have a median above its `slowMs`. It is left only after three good calls in a row. Samples leave only when a newer one replaces them or a clear runs. Entering the background, or a NetInfo transport change, resets it to `UNKNOWN` and blocks new samples until the app is active. A fetch still in flight across that clear is not recorded. Each sample is only a duration in milliseconds — no URL, hostname, headers, or body — and never goes to Redux, Sentry, or analytics.

**No fold.** `useNetworkTier()` and `useNetworkTierState()` do not read latency and do not re-render on it, so `SLOW_CELLULAR` still means 2g / 3g only. `useNetworkLatency()` returns `UNKNOWN` while the transport is `NONE`. `latency === 'SLOW'` is the trigger for a slow-connection signal, on any transport (including `WIFI`) and any hardware tier. Nothing in the UX matrix reads it yet.

**Hardware tier calibrates latency only.** The JS timer includes JS-thread wait, so `getHardwareTier()` (read once when the fetch wrapper is installed; `null` uses `MID`) selects the `LATENCY_THRESHOLDS` row. It never changes the network tier: a slow phone on a good link stays off `SLOW_CELLULAR`.

`null` means unknown — do not treat it as offline or low-end. `'NONE'` means we know there is no usable internet (`type === 'none'` or `isInternetReachable === false`). Explicit unreachability wins over `type === 'unknown'` / `null`. `vpn` / `bluetooth` / `wimax` / `other` / cellular with no generation are `null`.

**Note:** Keep the two values separate. Do not fold them into one “worst of RAM and network” flag — a short 3G blip would make a high-RAM phone look constrained.

## UX matrix (agents: check this)

Applies to **any screen you touch** (new or existing) that uses animation (including Rive), lists, polling, prefetch, realtime, heavy images, or blur. Do not migrate unrelated screens in the same change.

1. Read `getHardwareTier()` and `useNetworkTier()`.
2. Use the cell below. `null` hardware → network column only. `null` network → never treat as LOW or `'NONE'` (use the product default / MID-safe path).
3. Tell the human the cell and the levers you will change on **this** screen.

| Hardware \\ Network | `NONE`                                    | `SLOW_CELLULAR`                        | `FAST_CELLULAR` / `WIFI`                            | `null` network                            |
| ------------------- | ----------------------------------------- | -------------------------------------- | --------------------------------------------------- | ----------------------------------------- |
| **LOW**             | Local UI only: no fetch, no Rive, no blur | Less animation, rare poll, no prefetch | Light animation, short list, no extra work on mount | MID-safe / product default — never as LOW |
| **MID**             | Same as LOW × `NONE`                      | Debounce, fewer previews               | Product default                                     | Product default                           |
| **HIGH**            | Same as LOW × `NONE`                      | Still save radio (images, prefetch)    | Full experience                                     | Product default                           |
| **`null` hardware** | Network only (`NONE` row)                 | Network only                           | Product default                                     | Product default                           |

`WIFI` and `FAST_CELLULAR` are not speed. Measured latency is a separate signal (`useNetworkLatency()`). The difference between them is LAN (`wifi` and `ethernet`) versus cellular radio (`4g` and `5g`). Do not derive bandwidth or a data cap from either tier.

Levers: Rive vs static fallback, FlashList window / `getItemType`, poll interval, prefetch, image quality, blur/shadows.

`HIGH` + `WIFI` / `FAST_CELLULAR` = ship the designed experience. `LOW` + `NONE` = local only. Do not “cut everything” because a screen feels slow.

## Thresholds (`thresholds.ts`)

| Platform     | LOW        | MID        | HIGH       |
| ------------ | ---------- | ---------- | ---------- |
| iOS / iPadOS | `<= 2 GiB` | `<= 4 GiB` | `> 4 GiB`  |
| Android      | `< 3 GiB`  | `< 5 GiB`  | `>= 5 GiB` |

Android bands are lower because `MemoryInfo.totalMem` reports below advertised size (a “4 GB” phone is often ~3.6–3.8 GiB). A 4 GB iPhone (including iPhone 13) is `MID`.

Do not check hardware tier on the iOS simulator — it can report the Mac’s RAM.

Latency cutoffs per hardware tier (`LATENCY_THRESHOLDS`, from 90 days of production `http.client` spans on well-connected countries):

| Hardware tier      | `hungMs` | `slowMs` |
| ------------------ | -------- | -------- |
| `HIGH`             | 8000     | 2500     |
| `MID` (and `null`) | 15000    | 5500     |
| `LOW`              | 30000    | 12500    |

A call of about 3 s is above `slowMs` on `HIGH` only. On `MID` the median cutoff is 5.5 s, and on `LOW` it is 12.5 s. `global.fetch` records the real duration. It does not add delay. Enter `SLOW` with 2 samples at or above `hungMs` among the newest 5, or with at least 3 samples whose median is above `slowMs`. Leave `SLOW` only when the newest 3 are all at or below `slowMs`.

Not sampled: non-HTTP URLs (`data:`, `file:`, `content:`), `stream: true` fetches, `nitroPrefetched` cache hits, a rejection shorter than the hardware row's `hungMs`, fetches while the transport is `NONE` or the app is backgrounded, a fetch still in flight when samples are cleared, XHR, axios, and WebSocket. A connection failure at or above that `hungMs`, and an `AbortError` at or above that `hungMs`, record the elapsed time.

## Files

| File                             | Role                                           |
| -------------------------------- | ---------------------------------------------- |
| `types.ts`                       | `HardwareTier`, `NetworkTier`, `LatencyBucket` |
| `thresholds.ts`                  | Per-platform RAM cutoffs, latency cutoffs      |
| `computeHardwareTier.ts`         | Pure RAM → tier                                |
| `computeNetworkTier.ts`          | Pure NetInfo fields → transport tier           |
| `classifyFetchSample.ts`         | Pure settled fetch → duration or skip          |
| `computeLatencyBucket.ts`        | Pure samples → `UNKNOWN` / `OK` / `SLOW`       |
| `latencyStore.ts`                | In-memory samples, bucket, and reset listeners |
| `index.ts`                       | `getHardwareTier()`                            |
| `app/hooks/useNetworkTier.ts`    | NetInfo hooks (transport tier only)            |
| `app/hooks/useNetworkLatency.ts` | `useNetworkLatency()` (measured latency)       |

## Out of scope (this module)

- Battery
- Disk
- CPU
