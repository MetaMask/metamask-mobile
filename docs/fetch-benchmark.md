# nitro-fetch Performance Evaluation

## Startup prefetch -- how much faster?

**Token List (2.4 MB, largest startup call):**

| Implementation                       | Response  | Download | JSON.parse | Total      | vs Native      |
| ------------------------------------ | --------- | -------- | ---------- | ---------- | -------------- |
| Native fetch                         | 127 ms    | 35 ms    | 15 ms      | **184 ms** | --             |
| nitro-fetch                          | 125 ms    | 0 ms     | 16 ms      | **142 ms** | **23% faster** |
| **nitro-fetch + prefetchOnAppStart** | **29 ms** | **0 ms** | **14 ms**  | **43 ms**  | **77% faster** |

With `prefetchOnAppStart()`, Cronet fires the Token List request **during the native splash screen** (~4s before JS loads). By the time JS calls `fetch()`, the 2.4 MB response is already cached in native memory. The 127ms network round-trip is completely eliminated -- only cache retrieval (29ms) and JSON.parse (14ms) remain.

**This saves 141ms per app launch** compared to native fetch (just on one call).

## In-app fetch -- how much faster?

Tested head-to-head: both implementations fetch the **same URL at the same time** (`Promise.all`), eliminating server variability. 2 runs, 10 rounds each endpoint. Nitro wins 19 of 20 rounds.

### JS thread idle -- 1-18% faster

When the app is idle and the JS thread is free, nitro-fetch is consistently faster due to Cronet's native TLS and HTTP/2:

| Endpoint                  | Native | Nitro  | Diff    |
| ------------------------- | ------ | ------ | ------- |
| Historical Prices (29 KB) | 36 ms  | 35 ms  | **3%**  |
| Historical Prices (29 KB) | 37 ms  | 36 ms  | **2%**  |
| Historical Prices (29 KB) | 35 ms  | 31 ms  | **11%** |
| Historical Prices (29 KB) | 50 ms  | 41 ms  | **18%** |
| Historical Prices (29 KB) | 51 ms  | 44 ms  | **14%** |
| OHLCV Chart (52 KB)       | 162 ms | 152 ms | **7%**  |
| OHLCV Chart (52 KB)       | 161 ms | 160 ms | **1%**  |
| OHLCV Chart (52 KB)       | 165 ms | 164 ms | **1%**  |
| OHLCV Chart (52 KB)       | 167 ms | 165 ms | **1%**  |
| OHLCV Chart (52 KB)       | 304 ms | 296 ms | **3%**  |

### JS thread busy -- 32-86% faster

When the app is doing real work (controller persists, snap init, auth, rendering), native fetch's body processing has to **wait for the JS thread**. Cronet processes bodies in native C++ and is completely unaffected:

| Endpoint                  | Native      | Nitro      | Diff    | What was blocking JS                    |
| ------------------------- | ----------- | ---------- | ------- | --------------------------------------- |
| Historical Prices (29 KB) | **1654 ms** | **230 ms** | **86%** | Controller persists, snap bridges, auth |
| Historical Prices (29 KB) | **1872 ms** | **504 ms** | **73%** | Controller persists, snap bridges       |
| OHLCV Chart (52 KB)       | **1468 ms** | **993 ms** | **32%** | App startup activity                    |
| OHLCV Chart (52 KB)       | **1274 ms** | **680 ms** | **47%** | App startup activity                    |
| OHLCV Chart (52 KB)       | **960 ms**  | **280 ms** | **71%** | App startup activity                    |

In production, the JS thread is **rarely idle** -- there's always rendering, state updates, animations, or controller work happening. This is the realistic scenario, and nitro-fetch's advantage is dramatic.

## Full results

| Scenario                      | Native          | Nitro          | Improvement       |
| ----------------------------- | --------------- | -------------- | ----------------- |
| **Startup prefetch (2.4 MB)** | **184 ms**      | **43 ms**      | **77% faster**    |
| **In-app, JS busy**           | **960-1872 ms** | **230-993 ms** | **32-86% faster** |
| In-app, JS idle               | 35-304 ms       | 31-296 ms      | **1-18% faster**  |
| Parallel 5-chain (4.8 MB)     | 164 ms          | 131 ms         | **20% faster**    |
| JS thread blocked (parallel)  | 83 ms           | 0 ms           | **83 ms freed**   |

## How it works

### nitro-fetch (Cronet engine)

Native `fetch()` processes the response body on the **JS thread**. nitro-fetch does it in **native C++**:

```
Native fetch:                          nitro-fetch:
  fetch() -> headers arrive              fetch() -> headers + full body
  response.text() -> 35ms               response.text() -> 0ms
    download body                          (already buffered in C++)
    Brotli decompress
    bytes -> JS string
  JS thread blocked ████                 JS thread free
```

### prefetchOnAppStart

Fires HTTP requests during native app launch, before the JS bundle loads:

```
                Native splash (~4s)              JS loads        fetch() called
                ┌───────────────────────────────┐┌──────────────┐┌────────┐
  Without:      │ (idle)                        ││ Engine init  ││ 184ms  │
  With prefetch:│ ████ Token List downloading   ││ Engine init  ││  43ms  │ (cache hit)
                └───────────────────────────────┘└──────────────┘└────────┘
```

## Parallel fetches

5 token lists fetched simultaneously (4.8 MB total). Body processing queues on the single JS thread with native fetch:

```
JS thread with native fetch:
  ETH (2.4 MB):     ████████████████████ 49ms
  BSC (1.5 MB):     ████████████ 20ms
  Polygon (427 KB): █████ 7ms
  Arbitrum (383 KB):████ 6ms
  Optimism (128 KB):██ 3ms
  Total blocked:    ═══════════════════════════════ 83ms

JS thread with nitro-fetch:                          0ms
```

## When to use nitro-fetch

| Scenario                                 | Gain                         | Why                                                                              |
| ---------------------------------------- | ---------------------------- | -------------------------------------------------------------------------------- |
| **prefetchOnAppStart for startup calls** | **77% faster (141ms saved)** | Network round-trip happens during native splash, before JS loads                 |
| **Any fetch when JS thread is busy**     | **32-86% faster**            | Native fetch body processing waits for JS thread; Cronet processes in native C++ |
| Brotli responses > 500 KB                | 20-30% faster                | ~14ms saved per MB of body processing                                            |
| Parallel large fetches                   | 80+ ms JS freed              | Bodies processed in native threads simultaneously                                |
| Any fetch (idle JS thread)               | 1-18% faster                 | Cronet's native TLS/HTTP2 is faster than RN's networking stack                   |
