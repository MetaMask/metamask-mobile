# TagUrl

TagUrl is a component used to display Dapp information within a container.

## Props

This component extends `ViewProps` from React Native's [View Component](https://reactnative.dev/docs/view).

### `imageSource`

Favicon image from either a local or remote source.

| <span style="color:gray;font-size:14px">TYPE</span>                   | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------------------------- | :------------------------------------------------------ |
| [ImageSourcePropType](https://reactnative.dev/docs/image#imagesource) | Yes                                                     |

### `label`

Label within the tag.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

### `cta`

Object that contains the label and callback of the call to action.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [TagUrlCta](./TagUrl.types.ts#L3)                   | No                                                      |

```javascript
// Replace import with relative path.
import TagUrl from 'app/component-library/components/Tags/TagUrl';

<TagUrl
  url={IMAGE_URL}
  label={TAG_LABEL}
  cta={{ label: CTA_LABEL, onPress: ONPRESS_HANDLER }}
/>;
```
