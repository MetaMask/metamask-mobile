# Glass headers

Brand refresh headers. Content scrolls under the header, and a backdrop fades in behind it:

- **iOS:** blur plus a darkening gradient.
- **Android:** a darker gradient.

They are temporary wrappers until the design system ships glass headers.

| You use today (MMDS)     | Swap to                       |
| ------------------------ | ----------------------------- |
| `HeaderStandardAnimated` | `HeaderStandardAnimatedGlass` |
| `HeaderRoot`             | `HeaderRootGlass`             |
| `HeaderSubpage`          | `HeaderSubpageGlass`          |

Each one takes the same props as its MMDS header, plus these options:

| Prop             | Type                               | Default      | What it does                                                                                                                                               |
| ---------------- | ---------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isGlass`        | `boolean`                          | `true`       | Your screen's flag. Pass the flag as is: the components handle OS support themselves. `false` renders the plain MMDS header.                               |
| `backdrop`       | `'animated' \| 'static' \| 'none'` | `'animated'` | `animated` fades in as the content scrolls. `static` is always on. `none` shows no background.                                                             |
| `fadeInDistance` | `number`                           | `128`        | How many pixels of scroll the fade-in takes.                                                                                                               |
| `scrollY`        | `SharedValue<number>`              |              | `HeaderRootGlass` and `HeaderSubpageGlass` only: drives the fade. Without it, `animated` stays on. `HeaderStandardAnimatedGlass` reuses its own `scrollY`. |

**Built-in icons become glass capsules automatically.** This covers `onBack`, `onClose`, `startButtonIconProps` and `endButtonIconProps`, in the same order MMDS uses.

**Custom accessories pass through unchanged.** Wrap them in `CapsuleGlass` to match.

## JS header (Android, iOS < 26)

The header floats over the content. Use `useHeaderGlassInset` to keep the first row from starting under it.

```tsx
const { scrollY, onScroll, titleSectionHeightSv, setTitleSectionHeight } =
  useHeaderStandardAnimated();
const { inset, onLayout } = useHeaderGlassInset(isBrandRefresh, insets.top);

<Box twClassName="flex-1">
  <HeaderStandardAnimatedGlass
    isGlass={isBrandRefresh}
    onLayout={onLayout}
    includesTopInset
    title="Perps"
    onBack={goBack}
    scrollY={scrollY}
    titleSectionHeight={titleSectionHeightSv}
  />
  <Animated.ScrollView
    onScroll={onScroll}
    scrollEventThrottle={16}
    contentContainerStyle={{ paddingTop: inset }}
  >
    ...
  </Animated.ScrollView>
</Box>;
```

### Content that doesn't scroll under the header

Pass `isFloating={false}` instead. The header stays in the layout with no backdrop, so it can't cover the first row. Without blur, the backdrop fades out up to 40px below a floating header, and `useHeaderGlassInset` doesn't pad for that tail.

## Native header (iOS 26)

`HeaderStandardGlass` can hand an in-flow screen header (`isFloating={false}` with `includesTopInset`) to the native bar itself. Pass `isNativeHeaderEnabled`. It's behind `glassHeaders`, and the screen must not set `headerShown` on its own, or UIKit hides the bar.

For a custom bar, `useNativeHeader` gives the screen UIKit's Liquid Glass bar. Add the same backdrop under it:

1. Pass `hidesScrollEdgeEffect: true`, so UIKit's own scroll edge effect doesn't stack on top of the backdrop.
2. Measure the scroll with `useNativeHeaderScroll`. Under the native bar the content rests at a negative offset, and this hook accounts for that. It also returns the raw `scrollY`, which you can pass to `HeaderStandardAnimated`.
3. Render `NativeHeaderBackdrop` after the scroll view.

```tsx
const isNativeHeader = useNativeHeader({
  rightItems,
  isEnabled: isBrandRefresh,
  hidesScrollEdgeEffect: true,
});
const { scrollDistance, onScroll } = useNativeHeaderScroll(isNativeHeader);

<Box twClassName="flex-1">
  <Animated.ScrollView
    onScroll={onScroll}
    scrollEventThrottle={16}
    contentInsetAdjustmentBehavior="automatic"
  >
    ...
  </Animated.ScrollView>
  {isNativeHeader && <NativeHeaderBackdrop scrollDistance={scrollDistance} />}
</Box>;
```

## Building blocks

Reach for these only when none of the three headers fits:

- **`HeaderGlass`** floats any header over `HeaderGlassBackdrop`. It takes `backdrop`, `scrollDistance` and `fadeInDistance`.
- **`HeaderGlassBackdrop`** is the backdrop on its own, and fills its parent.
