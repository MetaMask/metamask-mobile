# TagUrl

TagUrl is a component used to display Dapp information within a container.

## Props

This component extends `ViewProps` from React Native's [View Component](https://reactnative.dev/docs/view).

### `url`

Url of the favicon.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| string                                              | Yes                                                     |

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
