/**
 * SocialBundleV1 prototype asset map.
 *
 * Design provided 9 static images in `app/images/socialBundleV1/`. This file
 * exposes them under semantic keys so mock data can reference traders and
 * tokens without leaking hashed filenames.
 *
 * Trader avatar mappings below are best-guesses from a first-pass visual
 * inspection — swap freely if the wrong image maps to the wrong trader.
 * Every mapping tagged `TODO(mapping):` is uncertain.
 */

// Fiery anime male with red aura — matches the Pain (Naruto) theme.
import painAvatar from '../../../../../images/socialBundleV1/J6TDXvar.png';
// Anime girl with "Born to Gamble" tee. TODO(mapping): could be Doji or Zuki.
import dojiAvatar from '../../../../../images/socialBundleV1/As7HjL7d.png';
// Anime pastel hoodie portrait. TODO(mapping): could be Doji or Zuki.
import zukiAvatar from '../../../../../images/socialBundleV1/5ZuV8eqk.png';
// Two guys at a bar. TODO(mapping): tentatively Sebastian.
import sebastianAvatar from '../../../../../images/socialBundleV1/3BLjRcxW.png';
// Person in front of art. TODO(mapping): tentatively Jijo.
import jijoAvatar from '../../../../../images/socialBundleV1/6S8Gezkx.png';
// Cat under a blanket. TODO(mapping): tentatively Nyhrox.
import nyhroxAvatar from '../../../../../images/socialBundleV1/CyaE1Vxv.png';
// Pepe "Get Money Team". TODO(mapping): tentatively arnz. Reused as a
// stand-in for Daumen too until Design ships a dedicated Daumen asset.
import arnzAvatar from '../../../../../images/socialBundleV1/J23qr98G.png';
const daumenAvatar = arnzAvatar;
// Only PUMP shipped as a static png. Everything else falls through to MMDS
// `AvatarToken` monogram rendering (see `cards/*`).
import pumpLogo from '../../../../../images/socialBundleV1/pump-logo.jpg';
import userAvatarSource from '../../../../../images/socialBundleV1/fox-cyborg.png';

export const TRADER_AVATARS = {
  pain: painAvatar,
  doji: dojiAvatar,
  zuki: zukiAvatar,
  sebastian: sebastianAvatar,
  jijo: jijoAvatar,
  nyhrox: nyhroxAvatar,
  arnz: arnzAvatar,
  daumen: daumenAvatar,
} as const;

export const TOKEN_LOGOS = {
  pump: pumpLogo,
} as const;

/** The signed-in user's avatar on the home header (top-left circle). */
export const USER_AVATAR = userAvatarSource;
