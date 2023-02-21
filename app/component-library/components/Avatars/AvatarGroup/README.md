# AvatarGroup

AvatarGroup is a component that renders horizontally an array of token avatars. An overflow counter will appear if there are more than four tokens.

## Props

This component extends [ViewProps](https://reactnative.dev/docs/view-style-props) from React Native's [View](https://reactnative.dev/docs/view) component.

### `tokenList`

A list of tokens metadata to be horizontally stacked.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| [AvatarGroupToken](./AvatarGroup.types.ts#L16)      | Yes                                                     |

## Usage

```javascript
// Replace import with relative path.
import AvatarGroup from 'app/component-library/components/Avatars/AvatarGroup';

<AvatarGroup
  tokenList={[
    { id: TOKEN_ID_1, image: TOKEN_IMAGE_1, imageUrl: TOKEN_IMAGE_URL_1 },
    { id: TOKEN_ID_2, image: TOKEN_IMAGE_2, imageUrl: TOKEN_IMAGE_URL_2 },
    { id: TOKEN_ID_3, image: TOKEN_IMAGE_3, imageUrl: TOKEN_IMAGE_URL_3 },
  ]}
/>;
```
