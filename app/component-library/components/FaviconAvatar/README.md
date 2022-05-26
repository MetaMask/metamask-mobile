# FaviconAvatar

FaviconAvatar is an Image component that renders an icon that is provided in the form of an URL. This component is based on the [BaseAvatar](../BaseAvatar/BaseAvatar.tsx) component.

## Props

This component extends [BaseAvatarProps](../BaseAvatar/BaseAvatar.types.ts#L17) from `BaseAvatar` component.

### `size`

Enum to select between size variants.

| <span style="color:gray;font-size:14px">TYPE</span>    | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :----------------------------------------------------- | :------------------------------------------------------ |
| [BaseAvatarSize](../BaseAvatar/BaseAvatar.types.ts#L6) | Yes                                                     |

### `imageUrl`

An Icon URL.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| String                                              | Yes                                                     |

# FaviconAvatar

The FaviconAvatar is an Image component wrapped by BaseAvatar component and renders the specified icon 

## Component API

### size
The size is inherited from the BaseAvatar component and accepts any enum from the AvatarSize enum

### imageUrl 
The image path that will be passed into the Image component

### style
The style prop accepts any valid stylesheet object and it will override the default stylesheet.
