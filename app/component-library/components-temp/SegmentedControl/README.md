# SegmentedControl

A SegmentedControl is a set of buttons grouped together to switch between related views or modes within the same context. It supports both single-select and multi-select modes.

## Props

### Common Props

### `options`

Array of options to display in the segmented control. Each option should have a `value` and `label`.

| Type                     | Required |
| :----------------------- | :------- |
| SegmentedControlOption[] | Yes      |

#### SegmentedControlOption Properties

| Property           | Type        | Required | Description                                 |
| :----------------- | :---------- | :------- | :------------------------------------------ |
| value              | string      | Yes      | Unique value for the option                 |
| label              | string      | Yes      | Label text to display                       |
| startIconName      | IconName    | No       | Optional icon to display before the label   |
| endIconName        | IconName    | No       | Optional icon to display after the label    |
| labelTextVariant   | TextVariant | No       | Optional text variant for the label         |
| testID             | string      | No       | Optional test ID for the option             |
| accessibilityLabel | string      | No       | Optional accessibility label for the option |

### `size`

Size of the control and its buttons. Uses the same sizes as buttons.

| Type       | Required | Default       |
| :--------- | :------- | :------------ |
| ButtonSize | No       | ButtonSize.Md |

### `isButtonWidthFlexible`

Whether buttons should size to their content instead of having equal widths.

| Type    | Required | Default |
| :------ | :------- | :------ |
| boolean | No       | true    |

### `isDisabled`

Whether the control is disabled.

| Type    | Required | Default |
| :------ | :------- | :------ |
| boolean | No       | false   |

### `isMultiSelect`

Whether the control allows selecting multiple options.

| Type    | Required | Default |
| :------ | :------- | :------ |
| boolean | No       | false   |

### `isScrollable`

Whether the control should be horizontally scrollable. Useful when there are many options that may not fit on the screen.

| Type    | Required | Default |
| :------ | :------- | :------ |
| boolean | No       | false   |

### Single-Select Mode Props (isMultiSelect = false)

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

### Multi-Select Mode Props (isMultiSelect = true)

### `selectedValues`

Array of selected option values. Each value should match one of the option values.

| Type     | Required |
| :------- | :------- |
| string[] | No       |

### `onValueChange`

Callback when selected options change. Receives an array of selected option values as an argument.

| Type                       | Required |
| :------------------------- | :------- |
| (values: string[]) => void | No       |

## Usage

### Single-Select Mode (Default)

```javascript
import SegmentedControl from 'app/component-library/components-temp/SegmentedControl';
import { ButtonSize } from 'app/component-library/components/Buttons/Button/Button.types';
import { IconName } from 'app/component-library/components/Icons/Icon';

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

### Multi-Select Mode

```javascript
import SegmentedControl from 'app/component-library/components-temp/SegmentedControl';
import { ButtonSize } from 'app/component-library/components/Buttons/Button/Button.types';

const options = [
  { value: 'mode1', label: 'Mode 1' },
  { value: 'mode2', label: 'Mode 2' },
  { value: 'mode3', label: 'Mode 3' },
];

const [selectedValues, setSelectedValues] = useState(['mode1', 'mode3']);

<SegmentedControl
  options={options}
  selectedValues={selectedValues}
  onValueChange={setSelectedValues}
  isMultiSelect
  size={ButtonSize.Md}
/>;
```

### With Icons

```javascript
import SegmentedControl from 'app/component-library/components-temp/SegmentedControl';
import { IconName } from 'app/component-library/components/Icons/Icon';

const optionsWithIcons = [
  { value: 'home', label: 'Home', startIconName: IconName.Home },
  { value: 'settings', label: 'Settings', startIconName: IconName.Setting },
  { value: 'wallet', label: 'Wallet', startIconName: IconName.Wallet },
];

const [selectedValue, setSelectedValue] = useState('home');

<SegmentedControl
  options={optionsWithIcons}
  selectedValue={selectedValue}
  onValueChange={setSelectedValue}
/>;
```

### Scrollable Control

```javascript
import SegmentedControl from 'app/component-library/components-temp/SegmentedControl';

const manyOptions = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'Option 2' },
  { value: 'option3', label: 'Option 3' },
  { value: 'option4', label: 'Option 4' },
  { value: 'option5', label: 'Option 5' },
  { value: 'option6', label: 'Option 6' },
];

const [selectedValue, setSelectedValue] = useState('option1');

<SegmentedControl
  options={manyOptions}
  selectedValue={selectedValue}
  onValueChange={setSelectedValue}
  isScrollable
/>;
```
