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

Maps `useNetInfo()` in the calling component. No extra NetInfo listener. Network changes, so this is a hook, not `getNetworkTier()`.

`null` means unknown — do not treat it as offline or low-end. `'NONE'` means we know there is no usable internet (`type === 'none'` or `isInternetReachable === false`). `vpn` / `bluetooth` / `wimax` / `other` / cellular with no generation are `null`.

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

Levers: Rive vs static fallback, FlashList window / `getItemType`, poll interval, prefetch, image quality, blur/shadows.

`HIGH` + `WIFI` / `FAST_CELLULAR` = ship the designed experience. `LOW` + `NONE` = local only. Do not “cut everything” because a screen feels slow.

## Thresholds (`thresholds.ts`)

| Platform     | LOW        | MID        | HIGH       |
| ------------ | ---------- | ---------- | ---------- |
| iOS / iPadOS | `<= 2 GiB` | `<= 4 GiB` | `> 4 GiB`  |
| Android      | `< 3 GiB`  | `< 5 GiB`  | `>= 5 GiB` |

Android bands are lower because `MemoryInfo.totalMem` reports below advertised size (a “4 GB” phone is often ~3.6–3.8 GiB). A 4 GB iPhone (including iPhone 13) is `MID`.

Do not check hardware tier on the iOS simulator — it can report the Mac’s RAM.

## Files

| File                          | Role                          |
| ----------------------------- | ----------------------------- |
| `types.ts`                    | `HardwareTier`, `NetworkTier` |
| `thresholds.ts`               | Per-platform RAM cutoffs      |
| `computeHardwareTier.ts`      | Pure RAM → tier               |
| `computeNetworkTier.ts`       | Pure NetInfo fields → tier    |
| `index.ts`                    | `getHardwareTier()`           |
| `app/hooks/useNetworkTier.ts` | Hook over `useNetInfo()`      |

## Out of scope (this module)

- Battery
- Disk
- CPU
