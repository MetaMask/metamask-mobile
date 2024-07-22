# AvatarGroup

AvatarGroup is a component that horizontally stacks multiple Avatar components.

## AvatarGroup Props

This component extends React Native's [ViewProps](https://reactnative.dev/docs/view) component.

### `avatarPropsList`

A list of Avatars to be horizontally stacked.
Note: AvatarGroup's `size` and `includesBorder` prop will overwrite each individual avatar's `size` and `includesBorder` prop.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| `AvatarProps[]`                                     | Yes                                                     |

### `size`

Optional enum to select between Avatar Group sizes.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| [`AvatarSize`](../Avatar/Avatar.types.ts)           | No                                                      | `AvatarSize.Xs`                                        |

### `maxStackedAvatars`

Optional enum to select the maximum number of Avatars visible before the overflow counter is displayed.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| `number`                                            | No                                                      | 4                                                      |

### `includesBorder`

Optional boolean to include a border or not.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| `boolean`                                           | No                                                      | `false`                                                |

## Usage

```javascript
// Passing list of AvatarProps to avatarPropsList
const avatarPropsList: AvatarProps[] = [
  {
    variant: AvatarVariant.Network,
    name: SAMPLE_AVATARNETWORK_NAME,
    imageSource: SAMPLE_AVATARNETWORK_IMAGESOURCE_REMOTE,
  },
  {
    variant: AvatarVariant.Network,
    name: SAMPLE_AVATARNETWORK_NAME,
    imageSource: SAMPLE_AVATARNETWORK_IMAGESOURCE_REMOTE,
  },
  {
    variant: AvatarVariant.Network,
    name: SAMPLE_AVATARNETWORK_NAME,
    imageSource: SAMPLE_AVATARNETWORK_IMAGESOURCE_REMOTE,
  },
];
<AvatarGroup avatarPropsList={avatarPropsList} />;

// Configuring different Avatar sizes
<AvatarGroup avatarPropsList={avatarPropsList} size={AvatarSize.Xs} />;
<AvatarGroup avatarPropsList={avatarPropsList} size={AvatarSize.Sm} />;
<AvatarGroup avatarPropsList={avatarPropsList} size={AvatarSize.Md} />;
<AvatarGroup avatarPropsList={avatarPropsList} size={AvatarSize.Lg} />;
<AvatarGroup avatarPropsList={avatarPropsList} size={AvatarSize.Xl} />;

// Configuring max number of stacked Avatars
<AvatarGroup avatarPropsList={avatarPropsList} maxStackedAvatars={3} />;

// Configuring border inclusion
<AvatarGroup avatarPropsList={avatarPropsList} includesBorder />;
<AvatarGroup avatarPropsList={avatarPropsList} includesBorder={false} />;
```
