import { useWindowDimensions, type TextStyle } from 'react-native';

/**
 * TEMPORARY prototype — Oswald display faces for a TestFlight / draft PR.
 * Do not treat as a design-system token. Remove with this experiment.
 *
 * Named files already encode weight. Keep fontWeight at 400 so iOS does not
 * synthetic-bold Oswald-Medium / Oswald-SemiBold.
 *
 * Profile / squad titles follow design-tokens `s*` vs `l*` (DisplayMd / HeadingLg)
 * at the design-system large breakpoint (768pt, Tailwind `md`).
 */

/** Width where design-tokens `l*` type styles apply. */
export const DESIGN_SYSTEM_LARGE_BREAKPOINT_WIDTH = 768;

const oswaldFace = {
  includeFontPadding: false,
  letterSpacing: 0,
};

export const oswaldSemiBoldStyle: TextStyle = {
  ...oswaldFace,
  fontFamily: 'Oswald-SemiBold',
};

export const oswaldMediumStyle: TextStyle = {
  ...oswaldFace,
  fontFamily: 'Oswald-Medium',
};

/** Home account balance — 44 / 56 (44/44 clips Oswald caps on iOS) */
export const oswaldHomeBalanceStyle: TextStyle = {
  ...oswaldSemiBoldStyle,
  fontSize: 44,
  lineHeight: 56,
};

/** Money mUSD balance — 44 / 56 (same clip as Home) */
export const oswaldMoneyBalanceStyle: TextStyle = {
  ...oswaldSemiBoldStyle,
  fontSize: 44,
  lineHeight: 56,
};

/** Money “Link your MetaMask Card” — Medium 28 / 32 */
export const oswaldLinkCardHeadingStyle: TextStyle = {
  ...oswaldMediumStyle,
  fontSize: 28,
  lineHeight: 32,
};

/** Token details price — 40 / 50 (sDisplayLG) */
export const oswaldTokenPriceStyle: TextStyle = {
  ...oswaldSemiBoldStyle,
  fontSize: 40,
  lineHeight: 50,
};

/** New-user onboarding screen headers — fixed 32/40 at every width */
export const oswaldOnboardingTitleStyle: TextStyle = {
  ...oswaldSemiBoldStyle,
  fontSize: 32,
  lineHeight: 40,
};

/** Profile entry / onboarding titles — sDisplayMD 32/40, lDisplayMD 48/56 */
export const oswaldProfileTitleStyleSmall: TextStyle = {
  ...oswaldSemiBoldStyle,
  fontSize: 32,
  lineHeight: 40,
};

export const oswaldProfileTitleStyleLarge: TextStyle = {
  ...oswaldSemiBoldStyle,
  fontSize: 48,
  lineHeight: 56,
};

/** Squad titles — sHeadingLG 24/32, lHeadingLG 32/40 */
export const oswaldSquadTitleStyleSmall: TextStyle = {
  ...oswaldSemiBoldStyle,
  fontSize: 24,
  lineHeight: 32,
};

export const oswaldSquadTitleStyleLarge: TextStyle = {
  ...oswaldSemiBoldStyle,
  fontSize: 32,
  lineHeight: 40,
};

export const getOswaldProfileTitleStyle = (isLarge: boolean): TextStyle =>
  isLarge ? oswaldProfileTitleStyleLarge : oswaldProfileTitleStyleSmall;

export const getOswaldSquadTitleStyle = (isLarge: boolean): TextStyle =>
  isLarge ? oswaldSquadTitleStyleLarge : oswaldSquadTitleStyleSmall;

export const useOswaldLargeBreakpoint = (): boolean => {
  const { width } = useWindowDimensions();
  return width >= DESIGN_SYSTEM_LARGE_BREAKPOINT_WIDTH;
};

export const useOswaldProfileTitleStyle = (): TextStyle =>
  getOswaldProfileTitleStyle(useOswaldLargeBreakpoint());

export const useOswaldSquadTitleStyle = (): TextStyle =>
  getOswaldSquadTitleStyle(useOswaldLargeBreakpoint());
