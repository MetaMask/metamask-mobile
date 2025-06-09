# Skeleton

Skeleton is a placeholder component that is used while the content is loading.

## Props

This component extends React Native's [ViewProps](https://reactnative.dev/docs/view) component.

### `height`

Optional prop to specify the height of the Skeleton.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| number \| string                                    | No                                                      |

### `width`

Optional prop to specify the width of the Skeleton.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| number \| string                                    | No                                                      |

### `children`

Optional prop for content to display within the skeleton.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| ReactNode                                           | No                                                      |

### `hideChildren`

Optional prop to hide the children of the Skeleton component while maintaining its dimensions.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> | <span style="color:gray;font-size:14px">DEFAULT</span> |
| :-------------------------------------------------- | :------------------------------------------------------ | :----------------------------------------------------- |
| boolean                                             | No                                                      | false                                                  |

### `style`

Optional custom styles for the skeleton component.

| <span style="color:gray;font-size:14px">TYPE</span> | <span style="color:gray;font-size:14px">REQUIRED</span> |
| :-------------------------------------------------- | :------------------------------------------------------ |
| StyleProp<ViewStyle>                                | No                                                      |

## Usage

### Basic Usage

```javascript
import { Skeleton } from 'app/component-library';

<Skeleton height={32} width={300} />;
```

### Multiple Skeletons

```javascript
import { Skeleton } from 'app/component-library';

<>
  <Skeleton height={32} width={300} />
  <Skeleton height={16} width={250} />
  <Skeleton height={16} width={250} />
</>;
```

### With Children

```javascript
import { Skeleton } from 'app/component-library';
import { View } from 'react-native';

<Skeleton
  style={{
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    backgroundColor: colors.background.alternative,
    borderRadius: 12,
    padding: 16,
  }}
>
  <Skeleton height={32} width="100%" />
  <Skeleton height={16} width="95%" />
  <Skeleton height={16} width="95%" />
</Skeleton>;
```

### Hiding Children

```javascript
import { Skeleton, Text } from 'app/component-library';

isLoaded ? (
  <Text>Content to load</Text>
) : (
  <Skeleton width="max-content" hideChildren={true}>
    <Text>Hidden placeholder text</Text>
  </Skeleton>
);
```
