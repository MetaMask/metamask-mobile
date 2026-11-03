# Glass and elevation guidelines

Prototype guidance for MetaMask Mobile. The ladder below is a recommendation to test, not a token change in `@metamask/design-system`. Installed packages were compared with live `main` of [metamask-design-system](https://github.com/MetaMask/metamask-design-system): `@metamask/design-tokens@12.0.0` and `@metamask/design-system-react-native@0.54.0`. Dark and light `background`, `border`, and `shadow` values on `main` match the installed package. The design system has no glass component and no sheen token.

## Principles

- Add a container only when the boundary means something. A row of text on the page does not need a card.
- Use a semantic color only for real meaning. `background.section` means "this group sits on the page". `background.muted` means "this is a control". `primary` means "this is the action". A gradient does not mean elevation.
- Follow Apple's interaction practice without copying its visual brand. Chrome can be a material that content scrolls under. MetaMask surfaces stay on MetaMask tokens. Do not introduce a frosted white, a system blue, or a highlight gradient to look like iOS.

## What the screenshots actually are

Checked against the code, not the pixels. Dark mode, brand-refresh flags on.

| What you see                                                               | What draws it                                                                                                                                                                                            | Real glass?                                          |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Floating tab pill (Home, Explore, Money, Social) and the separate + circle | `TabBarFloatingSurface`. Before this prototype: `BlurView` from `expo-blur` (`systemChromeMaterial`, intensity 60) with `border-muted`. Opaque fallback: `bg-section` + `border-muted`. Not `GlassView`. | No. System blur.                                     |
| Selected tab                                                               | `TabBarFloatingItem` sets `bg-muted` on the selected `ButtonAnimated`. Icon and label switch to default / medium.                                                                                        | No. A state fill on top of the blur.                 |
| Home account pill and the search + gift group                              | `WalletHeader` wraps them in `CapsuleGlass`: `GlassView` (`expo-glass-effect`, `regular`) when Liquid Glass is available, else `BlurView`, else `bg-section` + `border-muted`.                           | Yes, on iOS 26 with Reduce Transparency off.         |
| Money overflow circle                                                      | `MoneyHeader` → `HeaderRootGlass` → `ButtonIconGlass` → `CapsuleGlass`. The word "Money" is a normal header title, not a glass plate.                                                                    | Yes, the circle only.                                |
| Social avatar circle and the gift + edit group                             | `SocialHeaderGlassSurface`: `GlassView` or, if glass is unavailable, `bg-section` + `border-muted`. No blur step.                                                                                        | Yes, with a harder fallback than the other capsules. |
| Buy, Swap, Send, Receive                                                   | `AssetDetailsActions` → legacy `MainActionButton` with `isGlass`. That set `BoxGlass` `hasSheen`.                                                                                                        | Glass was underneath. At rest the sheen covered it.  |
| Add, Send, Card, Details                                                   | `MoneyActionButtonRow` → `MainActionButtonGlass` → `BoxGlass` `hasSheen`, wrapping the design-system `MainActionButton` with its own fill cleared.                                                       | Same sheen.                                          |
| Home banner ("Test Banner")                                                | `BrazeBannerCard` → `BoxGlass` `hasSheen`, `rounded-xl`.                                                                                                                                                 | Same sheen. The card is also tappable as a whole.    |
| Money promo ("Add money from your bank")                                   | `MoneyOnboardingCard` → `StepperCard` → `BoxGlass` `hasSheen`. The white "Get started" button is `ButtonGlass` variant primary, which deliberately stays the plain primary button.                       | The card was the sheen. The button was not.          |

Libraries: `expo-glass-effect` (`GlassView`, `isLiquidGlassAvailable`) and `expo-blur` (`BlurView`), both `~57.0.3`. There is no custom native glass module. `useLiquidGlass` turns glass off when `useBlurMaterial` reports Reduce Transparency, because `isLiquidGlassAvailable` ignores that setting. Older iOS gets blur. Android and a missing native module get an opaque fill.

## The sheen

The gradient on the tiles is not a separate elevation. It is `BoxGlass`'s `hasSheen` overlay:

- A `LinearGradient` of `background.muted` at three stops. Dark opacities `0.04 / 0.10 / 0.07`. Light opacities `0.075 / 0.20 / 0.10`.
- The gradient sits on an opaque `bg-default` layer painted over the `GlassView`, so at rest you see the gradient, not the glass. The comment in `BoxGlass` says the glass shows up in the press response.
- With the sheen on, the border is `0.6px`. In dark mode that border is `border.muted` at `0.18` opacity. In light mode it is full `border.muted`.

### Every sheen call site

| File                                                                                                 | Component                 | What it is                                                                          |
| ---------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------- |
| `app/component-library/components-temp/BoxGlass/BoxGlass.tsx`                                        | `BoxGlass`                | The implementation.                                                                 |
| `app/component-library/components-temp/MainActionButton/MainActionButton.tsx`                        | legacy `MainActionButton` | Home tiles. **Removed in this prototype.**                                          |
| `app/component-library/components-temp/MainActionButtonGlass/MainActionButtonGlass.tsx`              | `MainActionButtonGlass`   | Money tiles. **Removed in this prototype.**                                         |
| `app/components/UI/BrazeBanner/BrazeBannerCard.tsx`                                                  | `BrazeBannerCard`         | Home banner. **Replaced with `background.section` when the glass flag is on.**      |
| `app/component-library/components-temp/StepperCard/StepperCard.tsx`                                  | `StepperCard`             | Money promo card. **Replaced with `background.section` when the glass flag is on.** |
| `app/component-library/components-temp/ButtonGlass/ButtonGlass.tsx`                                  | `ButtonGlass` secondary   | Secondary buttons, including StepperCard's Skip. Still sheen.                       |
| `app/components/UI/Money/components/MoneyBalanceCard/MoneyBalanceCard.tsx`                           | `MoneyBalanceCard`        | Balance card. Still sheen.                                                          |
| `app/components/UI/Money/components/MoneyCondensedInfoCards/MoneyCondensedInfoCards.tsx`             | `MoneyCondensedInfoCards` | Info cards. Still sheen.                                                            |
| `app/components/UI/MarketInsights/components/MarketInsightsEntryCard/MarketInsightsEntryCard.tsx`    | `MarketInsightsEntryCard` | Entry card. Still sheen.                                                            |
| `app/components/UI/Perps/components/PerpsCompetitionBanner/PerpsCompetitionBanner.tsx`               | `PerpsCompetitionBanner`  | Banner. Still sheen.                                                                |
| `app/components/UI/Predict/views/PredictHome/components/PredictPortfolio/PredictPortfolioAction.tsx` | `PredictPortfolioAction`  | Portfolio action. Still sheen.                                                      |

Other `LinearGradient`s (charts, sports team colors, rewards, card art, header scroll fades) are not this sheen. `HeaderGlassBackdrop` fades a blur or a solid gradient as content scrolls under a header. That is a scroll affordance, not a surface elevation.

### Does it fit the ladder?

No. It is not Liquid Glass at rest, not a drop shadow, and not a 1px semantic border. It is a decorative highlight applied to controls and to cards, so those two levels look like one.

- The tiles do read as buttons, because of the icon, the label, and the press scale. The sheen does not do that work. The same sheen on the banner and the promo card makes those containers look like the tiles. The banner is tappable as a whole. The promo card is not; its button is the white primary inside it. The shared highlight hides that difference.
- Contrast: white `text.default` on the near-black sheen still clears 4.5:1 in dark mode, because the wash is faint. The edge does not clear 3:1. Dark `border.muted` is `#e2e2ff26` (about 15% white). The sheen border uses 18% of that. The control's boundary is below the 3:1 UI-component bar. Light mode is safer for the hairline (`border.muted` is `#b4b4b566`) and the text (`#121314` on a near-white wash), but the treatment still does not name a level.
- `text.muted` is already marked "Not accessible" in the tokens. Do not use it as the only label on a sheen or on glass.

### Recommendation

**Remove it. Do not make it a token or a variant.**

Replace tiles with the control fill that already exists: `background.muted` on the design-system `MainActionButton` (pressed: `background.mutedPressed`). Replace cards that used it with `background.section`. Glass stays on chrome that content actually scrolls under.

A sheen token would bless a decoration that erases the difference between a button and a container. That is the problem the ladder is here to fix.

## Refined ladder

Andrew's draft stacked treatments: flat color, then a 1px border, then a drop shadow, then Apple glass, on a `#000` base. `#000` is only the dark value of `background.default`. Light `background.default` is `#FFFFFF`. Light and dark also do not share one cue. In dark mode, elevation is a lighter fill. In light mode, `background.elevated1` and `background.elevated2` are the same white as the page, `border.alternative` is transparent, and the shadow does the work. A single "level 2 = border, level 3 = shadow" ladder fights the tokens.

Use roles. Map them onto tokens that already exist. Do not add `background-default` or `border-muted`; they are already `bg-default` and `border-muted`.

| Role       | Dark                                                                       | Light                                                                    | Treatment                                                                  | Use it for                                                  |
| ---------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------- |
| Base       | `background.default` `#000000`                                             | `background.default` `#FFFFFF`                                           | No container                                                               | App background                                              |
| Section    | `background.section` `#18181b`                                             | `background.section` `#F3F5F9`                                           | Flat fill. No border. No shadow                                            | Cards, banners, page sections                               |
| Subsection | `background.subsection` `#222226`                                          | `background.subsection` `#FFFFFF`                                        | Flat fill inside a section                                                 | A group nested in a card                                    |
| Control    | `background.muted` `#e2e2ff1b`                                             | `background.muted` `#b4b4b528`                                           | Flat wash. Not an elevation step                                           | Tiles and other buttons. Pressed: `background.mutedPressed` |
| Separator  | `border.muted` `#e2e2ff26`                                                 | `border.muted` `#b4b4b566`                                               | 1px line between siblings that share a fill                                | List dividers, input edges. Not a card border               |
| Floating   | `background.elevated2` `#18181b` + `border.alternative`                    | `background.elevated2` `#FFFFFF` + transparent border + `shadow.size.md` | Fill step in dark, shadow in light                                         | Toasts, menus, popovers. No scrim                           |
| Sheet      | `background.elevated1` `#0d0d0f` + `border.alternative` + `shadow.size.lg` | White + transparent border + `shadow.size.lg`                            | Opaque panel over `overlay.default`                                        | Sheets and modals                                           |
| Glass      | No fill token                                                              | No fill token                                                            | Liquid Glass, else system blur, else `background.section` + `border.muted` | Tab bar, header capsules, a single floating control         |

List rows stay on the parent fill. A row is not a new level. Add `border.muted` only when two rows would otherwise merge.

`background.elevated2` in dark is the same hex as `background.section`. A toast sitting on a section does not separate by fill. Keep floating UI over the page or over a scrim, and keep the hairline.

### Where each screenshot surface goes

| Surface                                                     | Role                                    | Why                                                                                                                |
| ----------------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Page behind everything                                      | Base                                    | The canvas                                                                                                         |
| Token rows, feed rows                                       | Base, or a separator                    | The type and the avatar already separate them                                                                      |
| Home banner, Money promo, other cards                       | Section                                 | The boundary means "this is a group"                                                                               |
| Buy / Swap / Send / Receive and Add / Send / Card / Details | Control (`background.muted`)            | They are buttons. Same role, same fill. Not glass                                                                  |
| Selected tab                                                | State on the glass (`background.muted`) | Selection, not a second surface                                                                                    |
| Tab pill, + button, header capsules                         | Glass                                   | Content moves under them                                                                                           |
| Trade menu opened from +                                    | Sheet                                   | It covers the page. It was glass plus a translucent `background.elevated1` wash. That wash was a second faux glass |
| Toasts and popover menus                                    | Floating                                | Nothing behind them should have to be dimmed                                                                       |

### Before and after for the tiles

Before, with the brand-refresh flag on (the three screenshots):

- Home Buy, Swap, Send, Receive and Money Add, Send, Card, Details render `BoxGlass` with `hasSheen`.
- At rest the surface is the muted gradient and a sub-3:1 hairline. Liquid Glass is hidden under that gradient until press.
- The banner and the Money promo use the same gradient, so a card and a button share a level.

After, in this prototype, same flag:

- Those tiles render the flat `background.muted` control. Home uses the legacy `MainActionButton` fill (`theme.colors.background.muted`). Money uses the design-system `MainActionButton` (`bg-muted`). No `GlassView`, no gradient.
- The banner and the Money promo render `background.section` with no sheen, so the card is visibly a different step from the tile.
- The tab pill and the + button go through one glass wrapper: Liquid Glass, then the existing chrome blur, then an opaque section.

## When to use glass

Use it when all of these are true:

- The surface is chrome, and content moves underneath it (a bar, a header capsule, one floating control).
- The thing on it is still legible if the content underneath is a light photo or a white card. If you cannot guarantee that, use the opaque fallback.
- There is a single glass layer. Do not put a glass card on a glass header over a glass tab bar.

## When not to use glass

- Cards, list rows, banners, tiles, sheets, toasts, menus.
- Anything inside a scrolling list. Each `GlassView` or `BlurView` samples the backdrop.
- A second glass layer on top of one that is already there.
- As a way to make a control look pressed, important, or branded. Use the control's own tokens.

## Do and don't

Do:

- Reach for `Box` and the semantic background / border props first.
- Keep the selected tab a flat `bg-muted` state on the bar, not its own `GlassView`.
- Give sheets `background.elevated1`, `border.alternative`, and the scrim. The in-repo `BottomSheetDialog` already does this.
- Turn `isInteractive` off when Reduce Motion is on. The glass press morph is motion.
- Treat unknown hardware (`getHardwareTier() === null`) as the product path. Unknown is not low.
- On low hardware, skip glass and blur even if the OS could draw them.

Don't:

- Paint the sheen, or a new gradient, to fake a level.
- Stack glass on glass.
- Use `text.muted` as the only text on a translucent surface.
- Invent a parallel shadow, blur, or color scale. `shadows.size.xs | sm | md | lg` and `colors.shadow.default` are the shadow tokens. They are iOS shadow objects. Android does not get a matching `elevation` number from the package today; the fill step and the hairline have to carry Android.
- Copy Apple's materials as a brand. `systemChromeMaterial` is a fallback for older iOS, not the MetaMask look.

## Fallback

`ElevationSurface` with `role="glass"` resolves in this order:

1. Low hardware (`getHardwareTier() === 'LOW'`, iOS at or below 2 GiB, Android below 3 GiB): opaque `background.section` + `border.muted`. No `GlassView`, no `BlurView`.
2. Liquid Glass, when `useLiquidGlass().isGlassEnabled` (iOS 26, module linked, Reduce Transparency off). `isInteractive` is forced off when Reduce Motion is on.
3. System blur, when glass is unavailable and `isBlurEnabled` (older iOS, module linked, Reduce Transparency off). Tint follows the app theme (`systemChromeMaterialDark` / `Light`), not the system theme.
4. Otherwise, including Android, Reduce Transparency, and a missing native module: the same opaque section.

Network tier is read and does not change the choice. Blur is local. `NONE` is not a reason to drop it, and `null` is not offline.

Reduce Transparency already flows through `useBlurMaterial` into `useLiquidGlass`. Do not call `isLiquidGlassAvailable` on its own.

## Risks

- **Contrast on glass.** Text needs 4.5:1 and UI chrome 3:1 against the worst content that can scroll underneath, not against the material's average color. Tab labels sit on the blur today. A light card under a thin material can fail. Prefer the chrome material or the opaque fallback wherever text sits. This prototype did not run a contrast meter on device.
- **The sheen's hairline fails 3:1 in dark mode.** That is one reason to remove it.
- **Reduce Transparency and Reduce Motion.** Transparency is handled. Motion is handled for the new wrapper's press response. Header scroll-blur in `HeaderGlassBackdrop` still animates intensity. That path was not changed.
- **Android and older iOS.** No Liquid Glass. Older iOS can blur. Android is opaque. The tab bar's opaque fallback is the same section fill the capsules already use, so the levels still read.
- **Low hardware.** Two live blurs on the tab bar (pill and + button) plus header capsules plus sheen gradients is a lot of backdrop work on a 2 GiB phone. Low tier now skips the tab bar's translucent materials. Header capsules do not yet use this wrapper, so they can still blur on a low device.
- **Stacking.** Home can show header capsules, sheen cards, and a blurred tab bar at once. This prototype takes glass off the tiles, the banner, the promo, and the trade sheet. Header capsules are still glass. Do not add more.
- **Dark floating fill.** `elevated2` equals `section` in dark mode. Don't put a menu on a section and expect the fill to separate them.
- **Light mode.** Shadow and scrim do the work, because the elevated fills are white. Checking only a `#000` screenshot will not catch a light-mode regression.
- **Social header fallback.** `SocialHeaderGlassSurface` skips blur and jumps to opaque. The other capsules blur first. Same component should own that later.
- **Performance was not measured on device.** The static call is: fewer sheen gradients on the home and money screens, one glass-or-blur decision for the two tab-bar surfaces, and no new list of backdrop views. Confirm on a low device and on Android before this leaves draft.

## Prototype scope

`ElevationSurface` is the only new container. Fill roles render design-system `Box` with the tokens above. The glass role is the wrapper. It does not replace `CapsuleGlass` yet.

Applied on the three screens:

- Tab pill and + button use the glass role.
- Trade menu (the sheet behind +) uses the sheet role instead of `GlassView` plus the translucent wash. The notched sheet was already opaque.
- Home and Money tiles drop the sheen and stay muted controls.
- Home banner and Money promo drop the sheen and use `background.section` while their glass flag is on.

Left on the sheen, on purpose: `ButtonGlass` secondary, `MoneyBalanceCard`, `MoneyCondensedInfoCards`, `MarketInsightsEntryCard`, `PerpsCompetitionBanner`, `PredictPortfolioAction`. They should follow the cards once the tiles look right.
