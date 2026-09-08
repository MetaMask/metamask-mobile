# InputStepper

Numeric stepper with increment/decrement controls, an optional suffix, and an optional warning/error description. Intended for keypad-driven amount entry (for example custom slippage).

## Exception: component-library `Input`

This component uses `app/component-library/components/Form/TextField/foundation/Input` instead of MMDS `Input` because the installed `@metamask/design-system-react-native` version does not export `Input`, and the keypad flow requires:

- `selection` / `onSelectionChange` for caret-aware edits
- `showSoftInputOnFocus={false}` to hide the system keyboard
- `caretHidden={false}` so the caret remains visible

All other chrome uses MMDS `Box`, `ButtonIcon`, `Text`, and `Icon` with `twClassName` / `useTailwind()`.

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

### `description`

Optional message row with `message`, `color`, and optional `icon`.

### `selection` / `onSelectionChange`

Optional caret control for keypad editing of the displayed value.

## Test IDs

- `input-stepper`
- `input-stepper-minus-button`
- `input-stepper-plus-button`
- `input-stepper-input`
- `input-stepper-post-value`
- `input-stepper-description-row`
- `input-stepper-description-icon`
- `input-text-description-message`

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
