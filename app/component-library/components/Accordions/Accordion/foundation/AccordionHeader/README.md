# AccordionHeader

AccordionHeader is a foundational component, used to create the [Accordion](../../Accordion.tsx).

## Props

This component extends React Native's [TouchableOpacity](https://reactnative.dev/docs/touchableopacity) component.

### `title`

Title of the Accordion Header.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `isExpanded`

Optional boolean to control the expanded state of the Accordion Header.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean    | No                                                     | false                                               |

### `onPress`

Optional function to trigger when pressing the Accordion Header.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                            | No                                                     |

## Usage

```javascript
// Replace import with relative path.
import AccordionHeader from 'app/component-library/components/Accordions/Accordion/foundation/AccordionHeader/AccordionHeader';

<AccordionHeader 
  title={TITLE} 
  isExpanded 
  onPress={ONPRESS_HANDLER}/>;
```
