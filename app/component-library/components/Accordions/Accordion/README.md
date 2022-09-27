# Accordion

Accordion is a single component, used to hide certain contents under an Accordion Header, and can be triggered to show when clicking an Accordion Header.

## Props

This component extends [AccordionHeaderProp](./foundation/AccordionHeader/AccordionHeader.types.ts#L7) component.

### `title`

Title of the Accordion Header.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `children`

Content to be hidden under the AccordionHeader.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | Yes                                                     |

### `isExpanded`

Optional boolean to control the expanded state of the Accordion Header.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean    | No                                                     | false                                               |

### `onPress`

Optional Function to trigger when pressing the Accordion Header.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| Function                                            | Yes                                                     |

## Usage

```javascript
// Replace import with relative path.
import Accordion from 'app/component-library/components/Accordions/Accordion/Accordion';

<Accordion 
  title={TITLE} 
  isExpanded 
  onPress={ONPRESS_HANDLER}>
    <ACCORDION_CONTENT/>
</Accordion>;
```
