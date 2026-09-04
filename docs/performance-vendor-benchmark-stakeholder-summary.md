# Performance Test Vendor Benchmark

## Executive summary

The benchmarking indicates that **TestMu HyperExecute is the best strategic
choice for MetaMask Mobile performance testing**.

TestMu combines:

- Strong execution speed
- Very high test resilience
- Near-zero session-creation errors
- The strongest support and collaboration experience
- Lower cost than the alternatives

Sauce Labs is also a resilient and capable option. BrowserStack provides a
useful baseline, but it showed higher execution variability and more
infrastructure-related disruption in the benchmark.

The recommendation is therefore to standardize on **TestMu HyperExecute** for
the performance-testing pipeline, while retaining the benchmark data as a
reference for future vendor reviews.

## What was benchmarked

The benchmark was based on many performance-test pipelines rather than a
single execution. Each pipeline ran a common set of **23 mobile performance
scenarios**:

- Some scenarios started through the **Onboarding flow**
- The remaining scenarios started through the **Login flow**
- The scenarios covered important wallet, account, asset, swap, prediction,
  and startup journeys

For every execution, we measured:

1. The application time for each scenario
2. Whether the scenario passed or failed its quality gate
3. Whether a session could be created reliably
4. The time required for the Onboarding and Imported Wallet test jobs
5. The consistency of results across repeated pipelines

This approach gives stakeholders a view of both user-facing performance and
the operational reliability of each vendor.

## High-level comparison

| Dimension | TestMu HyperExecute | Sauce Labs | BrowserStack |
|---|---|---|---|
| Overall recommendation | **Preferred vendor** | Strong alternative | Baseline / secondary option |
| Application scenario speed | **Fast and competitive** | **Fastest in the latest comparable sample** | Slower on average |
| Test resilience | **Very strong** | **Very strong** | More variable |
| Session-creation reliability | **0% session-create errors in the latest five-run sample** | **0% session-create errors in the latest five-run sample** | Session errors observed, averaging approximately 3.8% |
| Execution consistency | **Most stable overall** | Stable, with some variability | Highest timing variability |
| Support experience | **Superior support and collaboration** | Good | More limited for this use case |
| Cost | **Lowest** | Higher | Higher |
| Strategic fit | **Best balance of speed, resilience, support, and cost** | Good fallback | Useful comparison point, but weaker operational results |

The latest five-run comparison reported the following directional results:

| Measure | TestMu HyperExecute | Sauce Labs Public Cloud | BrowserStack |
|---|---:|---:|---:|
| Average passed scenarios | 17.6 / 23 | 16.8 / 23 | 18.2 / 23 |
| Average application scenario time | 4.22 s | **4.07 s** | 5.61 s |
| Effective parallel job wall time | 17.9 min | **15.9 min** | 30.7 min |
| Session-creation errors | **0%** | **0%** | 3.8% |

The application timings exclude infrastructure timeouts. The effective job
wall time is the longer of the Onboarding and Imported Wallet jobs because
those jobs run in parallel.

BrowserStack has a slightly higher raw pass count in this particular sample.
That metric alone does not outweigh the longer job time, higher session
failure rate, and greater timing variability. The decision should be based on
the complete operating picture rather than pass count alone.

## Why TestMu is the recommended decision

### 1. Best overall balance

TestMu does not depend on one isolated advantage. It offers a balanced
combination of speed, stability, support, and price. This reduces the risk of
optimizing one metric while creating operational problems elsewhere.

### 2. Resilient execution

Repeated pipelines showed that TestMu and Sauce Labs were highly resilient,
with almost no session-creation errors. This matters because a test that
cannot start does not provide useful product feedback and can delay releases.

TestMu also showed the lowest overall timing variation in the benchmark,
making performance trends easier to trust.

### 3. Faster feedback for engineering teams

Shorter effective job times mean that teams receive performance feedback
sooner. In the latest comparison, TestMu was substantially faster than
BrowserStack, while Sauce Labs was the fastest of the three on parallel job
wall time.

TestMu's result is particularly valuable because it combines fast feedback
with stronger consistency and support.

### 4. Superior support

The TestMu support experience was materially stronger for this performance
testing use case. Faster investigation, closer collaboration, and better
assistance with the execution environment reduce the time spent diagnosing
vendor infrastructure instead of improving the product.

For a recurring performance program, support quality is a productivity
multiplier, not just a procurement consideration.

### 5. Lower total cost

TestMu is the most cost-effective option. Combined with the shorter and more
reliable execution cycle, the lower price improves the total value of the
testing program:

- Lower direct vendor spend
- Less engineering time lost to failed sessions
- Faster feedback from each pipeline
- More confidence in repeated performance measurements

## Business impact

Choosing TestMu HyperExecute enables:

- More dependable performance signals before release
- Faster feedback for engineering and QA
- Fewer reruns caused by session infrastructure
- Better visibility into real application performance
- A stronger support relationship for the testing program
- Lower operating cost than the competing options

This is especially important for performance testing, where repeated runs
are necessary to distinguish a real regression from environmental noise.

## Recommendation

**Adopt TestMu HyperExecute as the primary vendor for MetaMask Mobile
performance testing.**

Use the 23-scenario benchmark as the ongoing baseline and periodically
revalidate the decision using the same methodology:

1. Run the same scenarios through the Onboarding and Login flows
2. Measure every scenario across multiple pipelines
3. Track quality-gate outcomes separately from infrastructure failures
4. Track session-creation reliability and job wall time
5. Review timing variation over time

Sauce Labs remains the strongest alternative based on resilience and speed.
BrowserStack remains useful as a comparison baseline, but its higher
variability and session disruption make it less attractive as the primary
performance platform.

## Reference reports

- [Final five-run vendor comparison](../final-he-saucecloud-bs-last5-compare.html)
- [Main-branch flakiness summary](../main-performance-flakiness-last30.html)
- [Vendor verdict](../vendor-verdict-he-bs-cloud.html)

