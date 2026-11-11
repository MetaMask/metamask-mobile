# Ramps Buy performance Sentry contract

This maps the Unified Buy V2 instrumentation to Sentry. It contains no
performance values. It is the counterpart to
[`docs/perps/performance/SENTRY.md`](../../perps/performance/SENTRY.md) and
reuses the same attribute vocabulary so Buy and Perps latency can be read the
same way.

## Rule

Every Buy span is started through `buildRampsBuyCufStartTags`. That is the only
place `feature`, `ramp_type`, and `lifecycle_context` are set, so no span can
reach Sentry without them. Add new cohort values to
`app/components/UI/Ramp/constants/rampsBuyCufTags.ts`, never as inline string
literals at a call site.

## Spans

| Span (`TraceName`)                 | Boundary                                      | Root?                    |
| ---------------------------------- | --------------------------------------------- | ------------------------ |
| `Ramp Buy To Order Details`        | Buy gesture → order details reached           | Yes                      |
| `Ramp Buy Quote Fetch`             | Quote request → usable quote or provider miss | Yes (`forceTransaction`) |
| `Ramp Screen Load`                 | Screen mount/foreground → meaningful content  | Yes (`forceTransaction`) |
| `Ramp Buy Continue To Checkout`    | Checkout gesture → checkout surface           | Child                    |
| `Ramp Buy Native To Order Created` | Native flow submit → order created            | Child                    |

The three roots are independent transactions that still carry `traceId` and
`parentSpanId`, so they appear under the journey in the trace view without
depending on it to close. This is deliberate: a child span is only transmitted
when its root ends, and a Buy journey can stay open for up to 30 minutes and
never end at all if the app dies. Nesting screen loads or quote fetches would
bias the data toward sessions that completed, which is the opposite of the
population these metrics exist to measure.

`Ramp Screen Load` is one span name for every route. Screens are separated by
the `screen_id` attribute, not by span name. Do not reintroduce a per-screen
name, because it makes every dashboard a moving target as routes are added.

## Attributes

### Bounded cohort attributes, safe to group by

- `feature`: always `buy`
- `ramp_type`: always `UNIFIED_BUY_2`
- `lifecycle_context`: `cold_process`, `warm`, `background_resume`
- `screen_id`: a value from `RAMP_V2_SCREEN_ID`
- `content_state`: `populated`, `empty`, `error`
- `surface`: entry point, a value from `RAMPS_BUY_CUF_SURFACE`
- `path`: `widget`, `native`, `custom_action`
- `provider`: only set when exactly one provider was requested
- `success`: `true` / `false`
- `reason`: a value from `RAMPS_BUY_CUF_END_REASON`, only when `success=false`

### Journey data, not group-by keys

- `foreground_active_ms`: journey duration with backgrounded time removed
- `background_count`, `resume_count`

Never attach wallet addresses, order IDs, amounts, or raw provider error bodies.

### `lifecycle_context` is a start attribute

It records the context the span opened in and is never recomputed at end.
Backgrounding during a journey is expressed by `background_count` and
`resume_count`, so the two concerns never share one value space.

Unlike Perps, Buy is not always-on: no Buy code runs until the user enters the
flow, so tracking arms on the first Buy span rather than at app start. The
first Buy flow of a process therefore reads `cold_process` even if the app was
backgrounded earlier while the user was elsewhere in the wallet. That is the
intended reading. Nothing about Buy was warm at that point.

A span settles the foreground to `warm` only on success. `Ramp Screen Load`
covers ordinary navigation. `Ramp Buy To Order Details` covers a resume where a
Buy screen stayed mounted and no screen span fires again, which would otherwise
leave `background_resume` stuck for the rest of the foreground.

## Queries

Use Trace Explorer, the spans dataset. Environment is `development` for local
builds and `production` for released ones. A local build never appears in
production data.

Start with the first query, then add filters one at a time. Stacking every
filter at once is the usual reason a healthy stream returns zero rows.
`success` is written at span end, so a tag chip for `success is true` can hide
real rows.

All Buy spans, the sanity check:

```
span.op:ramp.operation
```

Screen load latency. Group by `screen_id`, visualize `p75(span.duration)`:

```
span.op:ramp.operation span.name:"Ramp Screen Load" success:true
```

One screen:

```
span.op:ramp.operation span.name:"Ramp Screen Load" success:true screen_id:amount_input
```

Abandonment rate. Group by `reason` and `screen_id`:

```
span.op:ramp.operation span.name:"Ramp Screen Load" success:false
```

Always filter `success:true` on a latency widget. Screen spans close with
`success:false` and a `reason` of `unmounted`, `app_backgrounded`, or
`disabled` when the user leaves before content resolves. Those are
abandonment, not latency. Pooling them drags percentiles toward zero.

Cold versus warm navigation. Never pool these in one number:

```
span.op:ramp.operation span.name:"Ramp Screen Load" success:true lifecycle_context:cold_process
```

Quote fetch reliability. Group by `success` and `reason`
(`no_quote` is a provider miss, `error` is a failed request, `superseded` is a
newer fetch replacing an in-flight one):

```
span.op:ramp.operation span.name:"Ramp Buy Quote Fetch"
```

Journey duration, excluding time the user spent in external KYC or banking
apps: plot the `foreground_active_ms` measurement on
`Ramp Buy To Order Details` rather than the span duration, which includes
backgrounded time.

Every latency widget splits by platform and identifiable release. Android and
iOS are never pooled for a performance conclusion.

## Verifying locally

Sentry silently emits nothing in three situations, none of which logs a warning:

1. **No metrics consent.** `trace()` buffers instead of emitting, and
   `Sentry.init` is passed `enabled: false`. Re-onboarding or wiping the app
   resets this.
2. **No DSN.** `MM_SENTRY_DSN` is empty in `.js.env.example`, so Sentry is a
   no-op for anyone who never filled it in.
3. **A span open longer than five minutes.** It is marked `trace.timed_out` and
   dropped outright by `excludeEvents` rather than recorded as slow.

Because of that, verify instrumentation from the Metro log first, not from
Sentry. Every Buy span logs through `DevLogger` with a greppable marker:

```
[RampsBuyCUF] Ramp Screen Load started {"feature":"buy",...}
[RampsBuyCUF] Ramp Screen Load completed {"success":true,...}
```

If those lines appear but Sentry is empty, the problem is consent, DSN, or the
query. If they do not appear, the problem is the instrumentation.
