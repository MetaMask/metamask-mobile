# Glass usage guidelines

Glass (iOS 26 Liquid Glass, and the blurred material we use where Liquid Glass is unavailable) only reads as a material when the content underneath it changes. Today the chrome is translucent and the page behind it is one flat fill, so the bars look like tinted rectangles.

This is a design audit and a usage proposal. The prototype that demonstrates it is dev-only and does not change the production wallet. See [How to view the prototype](#how-to-view-the-prototype).

## What “flat” means here

A blur or glass effect samples whatever is behind it. If that sample is a single color, the result is a single color with a slight tint. Depth has to exist in the content layer. Putting glass on the content itself does not create that depth, and in a few places it removes it.

## Where glass is used today

The app does not use `@react-native-community/blur` anymore. Materials come from two Expo modules:

| Module                            | Role                                                                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `expo-glass-effect` (`GlassView`) | iOS 26 Liquid Glass. `useLiquidGlass` turns it on only when `isLiquidGlassAvailable()` is true and Reduce Transparency is off.      |
| `expo-blur` (`BlurView`)          | Older iOS. `useBlurMaterial` allows it on iOS when the native module is linked and Reduce Transparency is off. Android never blurs. |

`useLiquidGlass` picks one tier: Liquid Glass, else a blurred system material, else an opaque fill. Theme follows the app (`light` / `dark`), not the system.

### Chrome (the right job for glass)

| Surface                                                                                                                               | What it draws                                                                                                                                                                                                                                          | What sits under it                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Floating headers (`HeaderStandardGlass`, `HeaderRootGlass`, `HeaderSubpageGlass`, `HeaderSearchGlass`, `HeaderStandardAnimatedGlass`) | `HeaderGlassBackdrop`: on iOS, `systemUltraThinMaterial` at intensity 60, masked so it fades below the bar, plus a gradient of `background.default` at 80% / 50% / 0%. On Android, a longer gradient of the same color. Fades in over 128px of scroll. | The page. Wallet home, the token list, and most subpages paint `background.default` (`#FFFFFF` light, `#000000` dark) on the screen and the list. The gradient is that same color, so at rest it is invisible, and once content scrolls under it the sample is still that color. |
| Native bar, iOS 26 (`useNativeHeader`)                                                                                                | UIKit’s Liquid Glass bar, transparent, with UIKit’s scroll-edge effect unless the screen sets `hidesScrollEdgeEffect`.                                                                                                                                 | The same page fill. Screens that also draw `NativeHeaderBackdrop` stack our gradient on top of UIKit’s edge.                                                                                                                                                                     |
| Header capsules (`CapsuleGlass`, and `SocialHeaderGlassSurface`)                                                                      | `GlassView` regular, else chrome-material blur at intensity 100, else `bg-section` plus a hairline. Capsules take `shadows.size.md` only on the Liquid Glass path.                                                                                     | Header content. Children must not paint a background or they cover the material.                                                                                                                                                                                                 |
| Floating tab bar (`TabBarFloatingSurface`)                                                                                            | `systemChromeMaterial` at intensity 60, hairline `border-muted`. Opaque fallback is `bg-section`.                                                                                                                                                      | The bottom of the token list, which is `bg-default` rows on a `bg-default` page. The pill is inset, but the gutters are the same color as the rows.                                                                                                                              |
| Trade tray (`TradeWalletActions`)                                                                                                     | `GlassView` plus `BlurView`, with a 50% fill and a 20% page dim.                                                                                                                                                                                       | The same flat page.                                                                                                                                                                                                                                                              |

### Content that is glass today (avoid this)

`BoxGlass` is a `GlassView` with a hairline. `hasSheen` paints an **opaque** `bg-default` and a 4–20% wash of `background.muted` on top of the glass. The glass then samples that wash, not the page. Call sites include:

- Money balance card, condensed info cards, and action row
- Braze banner card
- Market insights entry card
- Stepper card
- `MainActionButton` / `MainActionButtonGlass`
- Chart indicator bar
- `ButtonGlass` for the secondary variant (primary and tertiary correctly stay opaque)

`useIsGlassSurfaceEnabled` gates brand-refresh surfaces on wallet home, Money, Perps, Predict, Trending, asset overview, and the home onboarding steps. The flag turns glass on. It does not give the glass anything to refract.

### Surfaces that are not glass

Bottom sheets (`BottomSheetDialog`) are opaque `background.elevated1` with `shadows.size.lg` and a hairline. The scrim is `overlay.default`, not a blur. That is the right model for a sheet: a solid panel over a dimmed page. Confirmations were fixed so the scrim stays translucent; the sheet body stayed opaque.

## Why the tokens don’t supply depth on their own

From `@metamask/design-tokens` (the installed theme):

| Token                    | Light       | Dark        | Intended role         |
| ------------------------ | ----------- | ----------- | --------------------- |
| `background.default`     | `#FFFFFF`   | `#000000`   | Page                  |
| `background.alternative` | `#F3F5F9`   | `#0D0D0F`   | Sunken, below default |
| `background.section`     | `#F3F5F9`   | `#18181B`   | Section on default    |
| `background.subsection`  | `#FFFFFF`   | `#222226`   | Subsection on section |
| `background.elevated1`   | `#FFFFFF`   | `#0D0D0F`   | Modal, sheet          |
| `background.elevated2`   | `#FFFFFF`   | `#18181B`   | Toast, menu           |
| `background.muted`       | `#B4B4B528` | `#E2E2FF1B` | Quiet fill            |
| `primary.muted`          | `#4459FF1A` | `#8B99FF26` | Brand wash            |
| `border.muted`           | `#B4B4B566` | `#E2E2FF26` | Hairline              |
| `border.alternative`     | transparent | `#E2E2FF26` | Elevated edge         |
| `shadow.default`         | `#0000001A` | `#00000066` | Drop shadow           |

Two consequences:

1. **Light mode has one real step.** `default`, `elevated1`, and `elevated2` are the same white. `alternative` and `section` are the same grey. A white card on a white page cannot separate by fill. Elevation is supposed to come from the shadow, and home does not use it. `border.alternative` is transparent, so an “elevated” edge draws nothing.
2. **Dark mode’s shadow disappears.** `shadow.default` is black at 40% on a black page. Separation has to come from the fill step (`#000` → `#18181B`) and the hairline. `alternative` (`#0D0D0F`) is only a hair above black, so a card that uses it will not read.

Wallet home sets the screen, the loader, and the account cluster to `colors.background.default`. `TokenList` is `bg-default`. Rows are not grouped onto a section surface. Scrolling that under a header or a tab bar feeds the material one color.

## Rules

Glass is chrome. It floats over a page that already has depth. It is not a fill for content.

### Use glass on

- Navigation bars and floating headers, including their icon capsules.
- The floating tab bar.
- Floating controls that sit over the page: the trade tray, a temporary menu, a search capsule.
- One scroll-edge effect per edge. On iOS 26, either UIKit’s edge or `HeaderGlassBackdrop`, not both (`hidesScrollEdgeEffect: true` when the screen draws its own backdrop).

### Do not use glass on

- Balance cards, promo cards, banners, list rows, or grouped lists.
- Forms, settings rows, or any dense data.
- Sheet and dialog bodies. Keep those on `background.elevated1` (dark) or white plus shadow (light), over the scrim.
- Primary buttons and any control that has to hold a specific brand fill. `ButtonGlass` already keeps primary and tertiary opaque. Extend that rule: secondary buttons on a card stay opaque too.
- Full-screen page backgrounds.

`BoxGlass` with `hasSheen` should not be the way a card gets a brand-refresh look. The sheen covers the glass with `bg-default`. If a card needs a quiet highlight, paint `primary.muted` or `background.muted` on an opaque surface.

### Legibility

- Body text sits on an opaque surface (`default`, `section`, or `subsection`), never on the glass.
- Labels that live on the chrome (header title, tab label, capsule icon) sit on **regular** Liquid Glass or **chrome** material. Ultra-thin material is a scroll-edge only. It is too weak to hold type on its own, which is why the header pairs it with the darkening gradient.
- Check contrast against the strongest color that can scroll under the bar, not against the resting page. A `primary.muted` wash is safe. A saturated illustration is not, unless the material stays as opaque as chrome material (tab bar intensity 60 is the current floor).
- Reduce Transparency already forces the opaque fallback in `useBlurMaterial`. Do not add a second preference check.
- Don’t put a background color on a child of `GlassView` or `BlurView`. It covers the material. The opaque fallback (`bg-section` or `bg-muted`) is the only place a fill belongs.

### How the content layer should be built

Give each glass edge something that is not `background.default` to sample, and keep the type on solid cards.

**Canvas.** The page behind the cards is the sunken token, not the card token.

|       | Canvas                       | Card                     | Edge                                                        |
| ----- | ---------------------------- | ------------------------ | ----------------------------------------------------------- |
| Light | `bg-alternative` (`#F3F5F9`) | `bg-default` (`#FFFFFF`) | `border-muted` and `shadows.size.sm`                        |
| Dark  | `bg-alternative` (`#0D0D0F`) | `bg-section` (`#18181B`) | `border-muted`. Skip the shadow. It is black on near-black. |

Light `section` is the same grey as `alternative`, so a light card has to be `default` (white) to step up. Dark `default` is black, darker than the canvas, so a dark card has to be `section`. One class name does not work for both themes.

The shadow tokens have no Android `elevation`. On Android a light card needs a small elevation or it will not lift. The prototype uses `elevation: 2` next to `shadows.size.sm` for that reason.

**One group, not a card per row.** Tokens, activity, and settings belong in a single rounded section. Rows inside it stay flat. A card per row is the dense-data case glass should not be used for, and it is also noisier as opaque cards.

**One accent per glass edge.** A `bg-primary-muted` wash (or a short row of `success` / `warning` / `error` muted chips) in the area that passes under the header and under the tab bar. The wash is not a wallpaper. It is a few dozen pixels of color so the material has a sample. Keep the first readable row clear of the bar. The color field may extend underneath it.

**Scroll edge.** The header backdrop can fade in with scroll, but the fade only shows up if the arriving content is a different color from the page. A static backdrop over a uniform fill looks the same at every scroll position. Prefer `backdrop="animated"` in product once the wash exists. The prototype uses `static` so the comparison is visible without scrolling.

**Corners.** Cards use a continuous-looking large radius (`rounded-2xl`). The tab bar and capsules stay `rounded-full`, matching the floating bar.

## Performance and device capability

Blur is expensive, and this screen is the kind the device-capability matrix applies to.

The prototype reads `getHardwareTier()` once and `useNetworkTier()` on each render. The two values stay separate. `null` is unknown, not low-end and not offline.

| Hardware \ Network                                                    | Blur                                                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Any hardware, network `NONE`                                          | Off. Local UI only.                                                                        |
| `LOW` and a known network                                             | Off.                                                                                       |
| `LOW` and network `null`                                              | On. Unknown network stays on the product default.                                          |
| `MID`, `HIGH`, or unknown hardware, and any network other than `NONE` | On, then still subject to `useBlurMaterial` (iOS, module linked, Reduce Transparency off). |

Levers on this screen: blur on or off. No fetch, no Rive, no image prefetch, no realtime. The list is four static rows, so it is not a `FlashList`. The production wallet list should stay virtualized. Only its container treatment would change.

Production headers and the real tab bar do not yet consult the hardware tier. That is a follow-up, not part of this prototype. Do not add a second full-screen blur on an edge that already has `HeaderGlassBackdrop` or the tab-bar material.

## How to view the prototype

The screen is registered only when `MM_ENABLE_SETTINGS_PAGE_DEV_OPTIONS=true` (the same gate as Developer Options, set in dev, experimental, and Flask builds).

1. Open Settings.
2. Open Developer options.
3. Open **Glass depth**.
4. The screen starts on **Flat**: `bg-default` page, ungrouped rows, glass header, floating tab bar.
5. Switch to **Layered**: `bg-alternative` canvas, white or `section` cards, `primary.muted` wash under the header, muted network chips tucked under the tab bar.

A caption at the bottom reports the hardware tier, the network tier, and whether the tab bar is actually blurring. On Android, and wherever Reduce Transparency is on, blur stays off and the header uses its gradient fallback. The layering still applies. That is the part of the proposal that can ship on every platform.

Files:

- `app/components/Views/GlassDepthPrototype/GlassDepthPrototype.tsx`
- `app/components/Views/GlassDepthPrototype/shouldDrawPrototypeBlur.ts`
- `app/components/Views/Settings/DeveloperOptions/GlassDepthPrototypeSection.tsx`

## What this does not change

- Wallet home, the token list, Money cards, and the live tab bar are untouched.
- No new remote feature flag. The route is the dev-options gate.
- `BoxGlass` and the header components are unchanged. The prototype consumes them.
- Adopting the layered treatment on wallet home is a separate change. It should follow this document, and it should not put `BoxGlass` on the balance or the token rows.
