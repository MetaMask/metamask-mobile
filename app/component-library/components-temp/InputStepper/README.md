# InputStepper

Numeric stepper with increment/decrement controls, an optional suffix, and an optional warning/error description. Intended for keypad-driven amount entry (for example custom slippage).

## Display, not a text input

The amount is rendered as MMDS `Text` with a blinking `InputStepperCursor` beside it, the same pattern as the Send amount field (`app/components/Views/confirmations/components/send/amount`). The keypad owns the value, so:

- the suffix stays flush with the digits instead of being pushed away by a caret inside a text field
- the amount cannot clip or scroll horizontally while digits are added or removed
- the font shrinks to fit (`adjustsFontSizeToFit`) if the amount overflows the row

Because there is no `TextInput`, the caret always sits at the end of the amount and cannot be repositioned by tapping. Consumers drive the value entirely through their keypad handler.

## Props

### `value`

Raw numeric string to display (locale separators are applied internally).

| TYPE   | REQUIRED |
| :----- | :------- |
| string | Yes      |

### `onIncrease` / `onDecrease`

Called when the plus or minus control is pressed. Disabled automatically at `maxAmount` / `minAmount`.

### `minAmount` / `maxAmount`

Numeric bounds used only to disable the stepper buttons.

### `postValue`

Optional suffix rendered after the value (for example `%`).

### `placeholder`

Rendered in muted text when `value` is empty. Defaults to `0`.

### `description`

Optional message rendered with MMDS `HelpText`. Pass `message` plus the `HelpText` props that control appearance — `severity` (`HelpTextSeverity`) and `showIcon` — instead of colors or icon config, so the design system owns the styling. An optional `testID` is forwarded to the `HelpText`.

### `decreaseButtonProps` / `increaseButtonProps`

Optional MMDS `ButtonIcon` overrides, for example consumer-specific `testID` and `accessibilityLabel`.

## Test IDs

- `input-stepper`
- `input-stepper-minus-button`
- `input-stepper-plus-button`
- `input-stepper-input`
- `input-stepper-cursor`
- `input-stepper-post-value`
- `input-stepper-description` (default when `description.testID` is not set)
- `help-text-icon` (owned by MMDS `HelpText` when `showIcon` is set)

## Usage

```tsx
import InputStepper from 'app/component-library/components-temp/InputStepper';

<InputStepper
  value="2"
  minAmount={0}
  maxAmount={100}
  postValue="%"
  onIncrease={() => undefined}
  onDecrease={() => undefined}
/>;
```
