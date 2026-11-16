# Money Historical Earnings Chart

## Goal

Fix the Money account historical earnings chart so every API bucket occupies
one uniform horizontal slot, users can select available buckets, and displayed
amounts and labels come from the API's declared range, granularity,
availability, and boundaries.

## API Contract

Expand the local historical earnings response types to match the endpoint
contract. The chart depends on these API fields:

- range `granularity`, `range_start`, `range_end`, `period_status`,
  `availability`, `totals`, and `buckets`;
- bucket `start`, `end`, `period_status`, `availability`,
  `interest_earned_usd`, and `unavailable_reasons`;
- response `updated_through` and denomination metadata.

Serialized bigint domain values remain strings. The hook does not convert,
aggregate, or replace response values. HTTP and decoding failures remain
visible through TanStack Query.

## Data Model

Map the selected API range to chart points one-to-one. Preserve bucket order
and never regenerate daily points or collapse slots.

Each chart point contains:

- `start` and exclusive `end`;
- API granularity;
- parsed USD amount when USD earnings are available;
- period status and availability;
- unavailable reasons.

An available serialized zero is valid earnings. It renders as a
minimum-height baseline, remains selectable, and displays `$0.00`.

A null amount with unavailable or not-applicable availability is not zero. It
keeps an empty horizontal slot, cannot be selected, and exposes its unavailable
state to assistive technology.

Use API range totals for summary values. Do not recompute authoritative totals
from buckets.

## Chart Layout

Use native React Native slots instead of an SVG chart or TradingView WebView.
Every bucket receives one equal-width flex slot. A fixed gap separates slots,
and each visual bar is bottom-aligned within the chart height.

Scale available positive amounts against the maximum available amount in the
selected range. Available zero amounts use the minimum visible bar height.
Unavailable and not-applicable buckets have no visible bar.

The whole slot is the press target, including a minimum-height zero bar. This
keeps interaction usable without changing visual proportions.

Active bars use the solid semantic primary color. Other available bars use the
muted semantic primary color.

## Selection

On first load and after a range change, select the latest available bucket. If
the final bucket is unavailable, search backward for the latest selectable
bucket. If no bucket is available, no bar is active.

Pressing an available bucket makes it active. Pressing the active bucket keeps
it active. Unavailable and not-applicable buckets do not respond to presses.

The header displays the active bucket's signed USD amount and bucket label. It
does not display an mUSD amount.

## Labels

Range context above the chart uses:

- `Earned in the last 7 days`
- `Earned in the last 30 days`
- `Earned in the last 3 months`
- `Earned in the last 6 months`
- `Earned in the last year`

The compact selector labels remain `1W`, `1M`, `3M`, `6M`, and `1Y`.

Bucket labels use UTC and treat `end` as exclusive:

- day: one date, such as `Nov 15`;
- week or partial multi-day bucket: inclusive display range, such as
  `Nov 9 – Nov 15`;
- month: inclusive display range, such as `Oct 1 – Oct 31`.

## Availability and Errors

A selected range whose earnings or USD pricing is unavailable renders the
existing visible chart error and retry action. Malformed required fields and
non-finite available amounts also render that error; no placeholder values are
substituted.

Partial ranges and partial buckets are valid. They render with their exact API
boundaries.

Individual unavailable or not-applicable buckets inside an otherwise
available range retain disabled empty slots. They do not fail the whole range.

Loading and empty-range behavior remain explicit. Empty means the API supplied
no buckets, not that available buckets earned zero.

## Accessibility

Each selectable slot is a button with selected state and an accessible label
containing its bucket date or range and formatted USD amount.

Unavailable slots expose their unavailable or not-applicable state without
pretending to be selectable earnings. Chart-level context continues to name
the selected period.

## Performance

Memoize range lookup, bucket transformation, and maximum calculation.
Selection remains local component state. At most thirteen slots render, so
selection can rerender the small bar row without adding per-bar memoization.

The native implementation avoids WebView startup, bridge traffic, and memory
cost for a small histogram.

## Testing

All API requests are mocked.

Update or add focused tests for:

1. Full hook response contract and fetch behavior.
2. Granularity and exclusive-boundary label transformation.
3. Preservation of one chart slot per API bucket.
4. Available zero versus unavailable null handling.
5. Latest available default selection.
6. Bar press updates amount, label, color, and accessibility state.
7. Long-form range context labels and compact range selector labels.
8. Range switching and selection reset.
9. Range-level failure, individual unavailable buckets, partial periods, and
   empty ranges.

## Scope

Included:

- Historical earnings response types.
- Bucket transformation and formatting.
- Native chart layout and selection.
- Long-form earnings context labels.
- Existing summary integration with authoritative API totals.
- Hook, transformation, and interaction tests.

Excluded:

- TradingView or SVG chart migration.
- Animation.
- mUSD display for selected buckets.
- Backend contract changes.
