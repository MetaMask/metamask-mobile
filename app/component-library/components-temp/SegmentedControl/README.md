# SegmentedControl

A SegmentedControl is a set of buttons grouped together to switch between related views or modes within the same context.

## Props

### `options`

Array of options to display in the segmented control. Each option should have a `value` and `label`.

| Type                     | Required |
| :----------------------- | :------- |
| SegmentedControlOption[] | Yes      |

### `selectedValue`

Value of the currently selected option. Should match one of the option values.

| Type   | Required |
| :----- | :------- |
| string | No       |

### `onValueChange`

Callback when an option is selected. Receives the selected option's value as an argument.

| Type                    | Required |
| :---------------------- | :------- |
| (value: string) => void | No       |

### `size`

Size of the control and its buttons. Uses the same sizes as buttons.

| Type       | Required | Default       |
| :--------- | :------- | :------------ |
| ButtonSize | No       | ButtonSize.Md |

### `isDisabled`

Whether the control is disabled.

| Type    | Required | Default |
| :------ | :------- | :------ |
| boolean | No       | false   |

## Usage

```javascript
import SegmentedControl from 'app/component-library/components-temp/SegmentedControl';
import { ButtonSize } from 'app/component-library/components/Buttons/Button/Button.types';

const options = [
  { value: 'mode1', label: 'Mode 1' },
  { value: 'mode2', label: 'Mode 2' },
  { value: 'mode3', label: 'Mode 3' },
];

const [selectedValue, setSelectedValue] = useState('mode1');

<SegmentedControl
  options={options}
  selectedValue={selectedValue}
  onValueChange={setSelectedValue}
  size={ButtonSize.Md}
/>;
```
