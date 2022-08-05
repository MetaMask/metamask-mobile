# CellContainerSelectItem

CellContainerSelectItem is a wrapper component typically used for item selection scenarios.

## Props

This component extends `TouchableOpacityProps` from React Native's [TouchableOpacityProps](https://reactnative.dev/docs/touchableopacity) component.

### `isSelected`

Determines item is selected.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| boolean                                             | Yes                                                     |

### `children`

Content to wrap for selection.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | Yes                                                     |

## Usage

```javascript
// Replace import with relative path.
import CellContainerSelectItem from 'app/component-library/components/Cells/CellContainerSelectItem';

<CellContainerSelectItem onPress={ONPRESS_HANDLER} isSelected={true}>
  <SampleContent />
</CellContainerSelectItem>;
```
