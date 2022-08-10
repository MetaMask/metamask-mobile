# CellContainerMultiselectItem

CellContainerMultiselectItem is a wrapper component typically used for multi-select scenarios.

## Props

This component extends `TouchableOpacityProps` from React Native's [TouchableOpacity](https://reactnative.dev/docs/touchableopacity) component.

### `isSelected`

Determines if checkbox is selected.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| boolean                                             | Yes                                                     |

### `children`

Content to wrap for multiselect.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | Yes                                                     |

## Usage

```javascript
// Replace import with relative path.
import CellContainerMultiselectItem from 'app/component-library/components/Cells/CellContainerMultiselectItem';

<CellContainerMultiselectItem onPress={ONPRESS_HANDLER} isSelected={true}>
  <SampleContent />
</CellContainerMultiselectItem>;
```
