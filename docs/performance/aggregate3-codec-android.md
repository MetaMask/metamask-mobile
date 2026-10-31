# Aggregate3 codec benchmark on Android Hermes

Temporary on-device measurement for [MetaMask/core#11010](https://github.com/MetaMask/core/pull/11010). The login screen in a dev build has a **Benchmark aggregate3 (300)** button that times the same 300-call Multicall3 `aggregate3` batch through three codecs:

- `ethers` — stock `@ethersproject/abi` `Interface` (current production behavior)
- `viem` — `encodeFunctionData` / `decodeFunctionResult` (viem 2.31.3, already installed in this app)
- `handrolled` — the fixed-layout string codec copied from the core PR

The button calls `runAggregate3CodecBenchmark()` and prints the summary on screen. The full JSON is logged as `AGGREGATE3_BENCH` in the Metro console.

## Runtime

Both runs use the Metro development bundle from this repo (`yarn watch:clean`) on Hermes Release, OSS `250829098.0.17`, bytecode version 98, Hades GC, with the debugger enabled. Date: 23 October 2026.

This is not the core PR's Hermes CLI bench (`hermesc -O`). Absolute milliseconds depend on the host. Each comparison between codecs is from one process, one workload, and one sampling method.

|        | Phone                       | Emulator                                |
| ------ | --------------------------- | --------------------------------------- |
| Device | Xiaomi M2011K2G             | Google `sdk_gphone64_arm64`             |
| OS     | Android 14 (API 34)         | Android 17 (API 37), `ro.kernel.qemu=1` |
| RAM    | 7,424,224 kB, about 7.1 GiB | 4,008,512 kB, about 3.8 GiB             |

## Workload

300 `aggregate3` calls, the batch size used for balance fetches:

- about 20% native `getEthBalance`
- the rest ERC-20 `balanceOf` across USDC, USDT, DAI, WBTC, and UNI
- unique lowercase account addresses
- synthetic response with 32-byte balances and about 5% failed (`0x`) results

Before timing, encode, decode, and `uint256` output for viem and the hand-rolled codec are checked against stock Ethers. `parityOk` was true.

Each stage is the median of 5 samples. Each sample runs until 120ms has elapsed (or 40 iterations, whichever comes first), then the elapsed time is divided by the iteration count. Timed stages are `encodeAggregate3`, `decodeAggregate3Response`, and `decodeUint256` for every successful result. `balanceOf` / `getEthBalance` calldata is built with Ethers up front and is not part of the timed section.

Lowercase addresses mean Ethers and viem skip EIP-55 checksum hashing. That favors those two codecs. Mixed-case addresses would make them slower.

## Phone button press

Taken from the login button on the Xiaomi. Metro log and the on-screen text matched.

| Codec      |     Encode | Decode response | Decode uint256 |  Full path | Versus Ethers |
| ---------- | ---------: | --------------: | -------------: | ---------: | ------------: |
| ethers     | 133.632 ms |      103.466 ms |      26.079 ms | 263.177 ms |            1x |
| viem       |  19.631 ms |       41.226 ms |      10.607 ms |  71.464 ms |        3.683x |
| handrolled |   2.348 ms |        1.250 ms |       0.591 ms |   4.189 ms |       62.826x |

An earlier call of the same function in that session, before the tap, landed in the same place: Ethers 255.999 ms, viem 70.313 ms, hand-rolled 4.134 ms (61.925x).

## Emulator, earlier session

Same function, `runAggregate3CodecBenchmark()`, on the arm64 Google emulator. CPU count was not recorded for this session. `parityOk` was true both times. The second run is after the first had already warmed the process.

| Codec      |    Encode | Decode response | Decode uint256 | Full path | Versus Ethers |
| ---------- | --------: | --------------: | -------------: | --------: | ------------: |
| ethers     | 43.344 ms |       34.536 ms |       9.067 ms | 86.947 ms |            1x |
| viem       |  6.538 ms |       13.227 ms |       3.477 ms | 23.242 ms |        3.741x |
| handrolled |  0.745 ms |        0.437 ms |       0.216 ms |  1.398 ms |       62.194x |

The first emulator run, before warmup, was slower and still well under the phone: Ethers 135.321 ms, viem 32.843 ms, hand-rolled 1.831 ms (73.906x).

The emulator is faster than the phone for this benchmark. The work is Hermes JavaScript on the CPU, and the arm64 emulator runs that on the Mac. The phone's slower CPU shows up directly. A UI or GPU path would not follow this result.

Warm emulator versus the phone button press, full path:

| Codec      |    Phone | Emulator | Phone / emulator |
| ---------- | -------: | -------: | ---------------: |
| ethers     | 263.2 ms |  86.9 ms |             3.0x |
| viem       |  71.5 ms |  23.2 ms |             3.1x |
| handrolled |   4.2 ms |   1.4 ms |             3.0x |

## Emulator, 1 CPU

Same emulator image, restarted with one core online (`nproc` = 1, `/sys/devices/system/cpu/online` = `0`). RAM was 4,008,484 kB. Two back-to-back calls in that process. `parityOk` was true both times.

First call:

| Codec      |     Encode | Decode response | Decode uint256 |  Full path | Versus Ethers |
| ---------- | ---------: | --------------: | -------------: | ---------: | ------------: |
| ethers     | 248.833 ms |      261.168 ms |      61.440 ms | 571.441 ms |            1x |
| viem       |  42.715 ms |      101.995 ms |      19.735 ms | 164.445 ms |        3.475x |
| handrolled |   5.277 ms |        3.102 ms |       0.899 ms |   9.278 ms |       61.591x |

That full path is about 2.2× the phone for every codec. The ratio versus Ethers stays near 62×, the same band as the phone and the earlier emulator session.

The second call on that single core was noisier. Ethers rose to 741.213 ms and viem to 221.359 ms, while the hand-rolled codec dropped to 4.976 ms, so the ratio became 149×. One core leaves the library codecs exposed to whatever else the process is doing. The hand-rolled codec stayed under 10 ms in both calls.

## How this compares with the core CLI bench

The core PR measured a release Hermes engine with `-O`, median of 3, and reported about 49.7 ms for Ethers and 1.125 ms for the hand-rolled codec on a 300-call batch (about 44x). viem was about 11.85 ms there. The phone's dev bundle is several times slower in absolute terms. The earlier warm emulator is closer to that CLI bench (Ethers 86.9 ms, hand-rolled 1.4 ms). With one CPU online, Ethers moves out to 571 ms and the hand-rolled codec to 9.3 ms. In every session the hand-rolled codec is first by a wide margin.

viem in this app is 2.31.3. The core PR uses viem ^2.56.8. `@ethersproject/abi` here is 5.7.0.

## Reproduce

1. Run `yarn watch:clean` and open the dev build on a device.
2. Open the login screen.
3. Tap **Benchmark aggregate3 (300)**. The JS thread blocks while the samples run (several seconds).
4. Read the on-screen summary, or the `AGGREGATE3_BENCH` warning in Metro.

The control is compiled only when `__DEV__` is true. The copied codec files live in `app/core/Performance/multicallAggregate3Poc/` and should be removed if this experiment is dropped.
