/**
 * ICON SET OVERRIDE — temporary scratch module.
 *
 * Swaps the design system's icon lookup table at runtime so that EVERY
 * component rendering a DS `Icon` picks up a different library, with no
 * per-component wiring.
 *
 * How it works: DS `Icon` reads `assetByIconName[name]` at render time, and
 * that map is a plain unfrozen object. Reassigning its entries therefore
 * redirects every icon on the next render.
 *
 * Metro with `unstable_enablePackageExports` may resolve the package through
 * either the `import` (.mjs) or `require` (.cjs) condition, so both asset
 * tables are patched. The relative file paths are required because
 * `assetByIconName` is not in the package's `exports` map.
 *
 * Remove this file with the rest of the icon experiment.
 */
import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
// eslint-disable-next-line import-x/no-namespace -- needed to resolve icons by name at runtime
import * as Phosphor from 'phosphor-react-native';
// eslint-disable-next-line import-x/no-namespace -- needed to resolve icons by name at runtime
import * as Lucide from 'lucide-react-native';
import {
  MATERIAL_VARIANTS,
  materialVariantKey,
  type MaterialStyle,
} from './material';
import {
  CornersInIcon,
  CornersOutIcon,
  FadersIcon,
  PlusCircleIcon,
  PresentationChartIcon,
  type IconWeight,
} from 'phosphor-react-native';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error -- deep relative import into the design system CJS build; see above.
import { assetByIconName } from '../../../../../node_modules/@metamask/design-system-react-native/dist/components/Icon/Icon.assets.cjs';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error -- deep relative import into the design system ESM build; see above.
import { assetByIconName as assetByIconNameEsm } from '../../../../../node_modules/@metamask/design-system-react-native/dist/components/Icon/Icon.assets.mjs';
import { assetByIconName as componentLibraryAssetByIconName } from '../../../../component-library/components/Icons/Icon/Icon.assets';

type IconComponent = React.ComponentType<Record<string, unknown>>;

/** DS names whose Phosphor equivalent is named differently. */
const PHOSPHOR_ALIASES: Record<string, string> = {
  Activity: 'Pulse',
  Add: 'Plus',
  AddCircle: 'PlusCircle',
  Ai: 'Sparkle',
  Arrow2Down: 'ArrowDown',
  Arrow2UpRight: 'ArrowUpRight',
  ArrowDown: 'CaretDown',
  ArrowLeft: 'CaretLeft',
  ArrowRight: 'CaretRight',
  AttachMoney: 'CurrencyDollar',
  Book: 'BookOpen',
  Campaign: 'Megaphone',
  Candlestick: 'PresentationChart',
  Card: 'CreditCard',
  Category: 'SquaresFour',
  Chart: 'ChartBar',
  ClockFilled: 'Clock',
  Close: 'X',
  Collapse: 'CornersIn',
  Confirmation: 'CheckCircle',
  Customize: 'Faders',
  Danger: 'WarningCircle',
  Diagram: 'ChartLineUp',
  Edit: 'PencilSimple',
  Ethereum: 'CurrencyEth',
  Exchange: 'CurrencyCircleDollar',
  Expand: 'CornersOut',
  Explore: 'Compass',
  Flash: 'Lightning',
  FlashFilled: 'Lightning',
  Global: 'Globe',
  Home: 'House',
  HomeFilled: 'House',
  Info: 'Info',
  Loading: 'CircleNotch',
  Lock: 'Lock',
  LockSlash: 'LockOpen',
  Mail: 'Envelope',
  Menu: 'List',
  Merge: 'ArrowsSplit',
  MoneyBag: 'Money',
  MoreHorizontal: 'DotsThree',
  MoreVertical: 'DotsThreeVertical',
  Musd: 'CurrencyCircleDollar',
  MusdFilled: 'CurrencyCircleDollar',
  Notification: 'Bell',
  People: 'UsersThree',
  Predictions: 'ChartBar',
  Question: 'Question',
  Received: 'ArrowDownLeft',
  Refresh: 'ArrowsClockwise',
  Search: 'MagnifyingGlass',
  Security: 'ShieldCheck',
  Send: 'PaperPlaneTilt',
  Setting: 'Gear',
  SettingFilled: 'GearFine',
  Share: 'ShareNetwork',
  Sms: 'ChatCenteredDots',
  Stake: 'Plant',
  StarFilled: 'Star',
  SwapHorizontal: 'ArrowsLeftRight',
  SwapVertical: 'ArrowsDownUp',
  Tint: 'Drop',
  UserCircleAdd: 'UserPlus',
  Verified: 'SealCheck',
  VerifiedFilled: 'SealCheck',
  WalletFilled: 'WalletFill',
  Warning: 'Warning',
};

/**
 * DS filled glyphs keep Phosphor `fill` even when the set weight is outline.
 * Selected tab icons (HomeFilled, MusdFilled, ClockFilled, …) depend on this.
 */
const phosphorWeightFor = (name: string, weight: IconWeight): IconWeight =>
  name.endsWith('Filled') ? 'fill' : weight;

/** DS names that resolve to a Phosphor export of the same name. */
const PHOSPHOR_DIRECT: readonly string[] = [
  'AppleLogo',
  'ArrowCircleDown',
  'ArrowCircleUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'Backspace',
  'Bank',
  'Book',
  'Bookmark',
  'Bridge',
  'Briefcase',
  'Cake',
  'Calculator',
  'Calendar',
  'Camera',
  'Check',
  'Clock',
  'Cloud',
  'Code',
  'Coin',
  'Copy',
  'Download',
  'Eraser',
  'Export',
  'Eye',
  'EyeSlash',
  'File',
  'Fingerprint',
  'Fire',
  'Flag',
  'Flask',
  'Flower',
  'Folder',
  'Gift',
  'Graph',
  'HardDrive',
  'Heart',
  'Image',
  'Info',
  'Joystick',
  'Key',
  'Link',
  'Lock',
  'Minus',
  'MinusSquare',
  'Money',
  'Monitor',
  'MusicNote',
  'Notification',
  'Palette',
  'Plant',
  'Plug',
  'QrCode',
  'Question',
  'Rocket',
  'Scan',
  'Share',
  'ShoppingBag',
  'ShoppingCart',
  'Sparkle',
  'Speedometer',
  'Square',
  'Star',
  'Storefront',
  'Student',
  'Tag',
  'Translate',
  'Trash',
  'TrendDown',
  'TrendUp',
  'Trophy',
  'Upload',
  'Usb',
  'User',
  'UserCheck',
  'UserCircle',
  'Wallet',
  'Warning',
  'X',
];

const PHOSPHOR_REGISTRY = Phosphor as unknown as Record<string, IconComponent>;

/**
 * Named imports Metro's `import *` table can miss. Keys are Phosphor export
 * names (the alias target), not DS names.
 */
const PHOSPHOR_EXPLICIT: Record<string, IconComponent> = {
  CornersIn: CornersInIcon as unknown as IconComponent,
  CornersOut: CornersOutIcon as unknown as IconComponent,
  Faders: FadersIcon as unknown as IconComponent,
  PlusCircle: PlusCircleIcon as unknown as IconComponent,
  PresentationChart: PresentationChartIcon as unknown as IconComponent,
};

const resolvePhosphor = (dsName: string): IconComponent | undefined => {
  const base = PHOSPHOR_ALIASES[dsName] ?? dsName;
  return (
    PHOSPHOR_EXPLICIT[base] ??
    PHOSPHOR_REGISTRY[`${base}Icon`] ??
    PHOSPHOR_REGISTRY[base]
  );
};

const PHOSPHOR_BY_DS_NAME: Record<string, IconComponent> = {};
[...PHOSPHOR_DIRECT, ...Object.keys(PHOSPHOR_ALIASES)].forEach((dsName) => {
  const resolved = resolvePhosphor(dsName);
  if (resolved) {
    PHOSPHOR_BY_DS_NAME[dsName] = resolved;
  }
});

const LUCIDE_REGISTRY = Lucide as unknown as Record<string, IconComponent>;

/** DS names whose Lucide equivalent is named differently. */
const LUCIDE_ALIASES: Record<string, string> = {
  Add: 'Plus',
  Bank: 'Landmark',
  Campaign: 'Megaphone',
  Candlestick: 'ChartCandlestick',
  Category: 'LayoutGrid',
  Clock: 'Clock',
  Close: 'X',
  Code: 'Code',
  Confirmation: 'CircleCheck',
  Danger: 'CircleAlert',
  Edit: 'Pencil',
  Export: 'Upload',
  Flash: 'Zap',
  Global: 'Globe',
  Home: 'House',
  Info: 'Info',
  Link: 'Link',
  Lock: 'Lock',
  LockSlash: 'LockOpen',
  Menu: 'Menu',
  MoreHorizontal: 'Ellipsis',
  MoreVertical: 'EllipsisVertical',
  Notification: 'Bell',
  Refresh: 'RefreshCw',
  Search: 'Search',
  Security: 'ShieldCheck',
  Send: 'Send',
  Setting: 'Settings',
  SettingFilled: 'Settings2',
  Share: 'Share2',
  Speedometer: 'Gauge',
  Star: 'Star',
  StarFilled: 'Star',
  SwapHorizontal: 'ArrowLeftRight',
  SwapVertical: 'ArrowUpDown',
  Tag: 'Tag',
  Trash: 'Trash2',
  User: 'User',
  Wallet: 'Wallet',
  WalletFilled: 'WalletCards',
  Warning: 'TriangleAlert',
};

/** DS names that resolve to a Lucide export of the same name. */
const LUCIDE_DIRECT: readonly string[] = [
  'Accessibility',
  'Activity',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'Ban',
  'Bold',
  'Book',
  'Bookmark',
  'Briefcase',
  'Cake',
  'Calculator',
  'Calendar',
  'Camera',
  'Check',
  'CircleX',
  'Clock',
  'Cloud',
  'CloudDownload',
  'CloudUpload',
  'Code',
  'Copy',
  'Download',
  'Eraser',
  'Expand',
  'Eye',
  'File',
  'Flag',
  'Flower',
  'Folder',
  'Gift',
  'Group',
  'HardDrive',
  'Heart',
  'Image',
  'Info',
  'Joystick',
  'Key',
  'Link',
  'Lock',
  'Mail',
  'Map',
  'Menu',
  'Merge',
  'Mic',
  'Minus',
  'Monitor',
  'Palette',
  'Pin',
  'Plug',
  'QrCode',
  'Rocket',
  'Save',
  'Scan',
  'ScanBarcode',
  'Search',
  'Send',
  'Share',
  'ShieldLock',
  'ShoppingBag',
  'ShoppingCart',
  'Slash',
  'Sparkle',
  'Square',
  'Star',
  'Tablet',
  'Tag',
  'Trash',
  'Trophy',
  'Undo',
  'Upload',
  'Usb',
  'User',
  'UserCheck',
  'VolumeOff',
  'Wallet',
  'Wifi',
  'WifiOff',
  'X',
];

const LUCIDE_BY_DS_NAME: Record<string, IconComponent> = {};
[...LUCIDE_DIRECT, ...Object.keys(LUCIDE_ALIASES)].forEach((dsName) => {
  const resolved = LUCIDE_REGISTRY[LUCIDE_ALIASES[dsName] ?? dsName];
  if (resolved) {
    LUCIDE_BY_DS_NAME[dsName] = resolved;
  }
});

/** Lucide's only variable axis is stroke width; it has no fill/solid variants. */
export const LUCIDE_STROKE_WIDTHS: readonly number[] = [1, 1.5, 2, 2.5, 3];

const ASSET_MAP = assetByIconName as Record<string, IconComponent>;
const ESM_ASSET_MAP = assetByIconNameEsm as Record<string, IconComponent>;
const CL_ASSET_MAP = componentLibraryAssetByIconName as unknown as Record<
  string,
  IconComponent
>;

/** Pristine copy, captured once at module load, for restoring. */
const ORIGINAL_ASSETS: Record<string, IconComponent> = { ...ASSET_MAP };
const ORIGINAL_ESM_ASSETS: Record<string, IconComponent> = {
  ...ESM_ASSET_MAP,
};
const ORIGINAL_CL_ASSETS: Record<string, IconComponent> = { ...CL_ASSET_MAP };

export const ALL_DS_ICON_NAMES: readonly string[] =
  Object.keys(ORIGINAL_ASSETS);

export type IconSetName = 'design-system' | 'material' | 'phosphor' | 'lucide';

/** Which DS names the given set actually backs, for the coverage labels. */
export const coverageFor = (set: IconSetName): Set<string> => {
  if (set === 'material') {
    // Every vendored variant carries the same 140 names.
    return new Set(Object.keys(MATERIAL_VARIANTS.outlined));
  }
  if (set === 'phosphor') {
    return new Set(Object.keys(PHOSPHOR_BY_DS_NAME));
  }
  if (set === 'lucide') {
    return new Set(Object.keys(LUCIDE_BY_DS_NAME));
  }
  return new Set(ALL_DS_ICON_NAMES);
};

interface AdaptedProps {
  style?: StyleProp<ViewStyle>;
  [key: string]: unknown;
}

interface FlatIconStyle {
  color?: string;
  width?: number;
  height?: number;
}

/**
 * The DS `Icon` renders `<SVG name fill="currentColor" style={svgStyle} />`,
 * where `svgStyle` carries the resolved colour and w/h from Tailwind classes.
 * These adapters read that flattened style and translate it into each library's
 * own contract, so the override works anywhere in the app without needing a
 * context provider above it.
 */
const adaptMaterial = (Svg: IconComponent): IconComponent => {
  const Adapted = ({ style, ...rest }: AdaptedProps) => {
    const flat = StyleSheet.flatten(style) as FlatIconStyle | undefined;
    return (
      <Svg
        {...rest}
        style={style}
        width={flat?.width ?? 24}
        height={flat?.height ?? 24}
        fill={flat?.color ?? 'currentColor'}
      />
    );
  };
  return Adapted as IconComponent;
};

const adaptPhosphor = (
  PhosphorIcon: IconComponent,
  weight: IconWeight,
): IconComponent => {
  const Adapted = ({
    style,
    width,
    height: _height,
    color,
    fill: _fill,
    ...rest
  }: AdaptedProps) => {
    const flat = StyleSheet.flatten(style) as FlatIconStyle | undefined;
    const size =
      (typeof flat?.width === 'number' ? flat.width : undefined) ??
      (typeof width === 'number' ? width : undefined) ??
      24;
    const resolvedColor =
      (typeof flat?.color === 'string' ? flat.color : undefined) ??
      (typeof color === 'string' ? color : undefined) ??
      'currentColor';
    return (
      <PhosphorIcon
        {...rest}
        style={style}
        size={size}
        color={resolvedColor}
        weight={weight}
      />
    );
  };
  return Adapted as IconComponent;
};

/**
 * Lucide is stroke-based: it renders `fill="none" stroke="currentColor"`. The DS
 * `Icon` passes `fill="currentColor"`, and Lucide spreads unknown props over its
 * own defaults *and* onto every child element — so that fill would flood each
 * glyph solid. `fill` is therefore discarded here and forced back to "none".
 */
const adaptLucide = (
  LucideIcon: IconComponent,
  strokeWidth: number,
  absoluteStrokeWidth: boolean,
): IconComponent => {
  const Adapted = ({ style, fill: _discardedFill, ...rest }: AdaptedProps) => {
    const flat = StyleSheet.flatten(style) as FlatIconStyle | undefined;
    return (
      <LucideIcon
        {...rest}
        style={style}
        size={flat?.width ?? 24}
        color={flat?.color ?? 'currentColor'}
        strokeWidth={strokeWidth}
        absoluteStrokeWidth={absoluteStrokeWidth}
        fill="none"
      />
    );
  };
  return Adapted as IconComponent;
};

/**
 * Point every DS icon name at `set`. Names with no equivalent keep their
 * original DS asset, so nothing ever renders blank. Mutation alone does not
 * re-render React — the caller must force one (the lab bumps a key).
 */
export interface MaterialOptions {
  style: MaterialStyle;
  filled: boolean;
}

export interface LucideOptions {
  strokeWidth: number;
  absoluteStrokeWidth: boolean;
}

const applySetToMap = (
  map: Record<string, IconComponent>,
  originals: Record<string, IconComponent>,
  set: IconSetName,
  weight: IconWeight,
  materialSet: Record<string, IconComponent | undefined>,
  lucide: LucideOptions,
): void => {
  Object.keys(originals).forEach((name) => {
    // Guard: an unmapped or missing entry must never reach React as
    // `undefined`, which renders as "Element type is invalid".
    if (!originals[name]) {
      return;
    }
    if (set === 'material') {
      const svg = materialSet[name];
      map[name] = svg ? adaptMaterial(svg) : originals[name];
      return;
    }
    if (set === 'phosphor') {
      const icon = PHOSPHOR_BY_DS_NAME[name];
      map[name] = icon
        ? adaptPhosphor(icon, phosphorWeightFor(name, weight))
        : originals[name];
      return;
    }
    if (set === 'lucide') {
      const icon = LUCIDE_BY_DS_NAME[name];
      map[name] = icon
        ? adaptLucide(icon, lucide.strokeWidth, lucide.absoluteStrokeWidth)
        : originals[name];
      return;
    }
    map[name] = originals[name];
  });
};

export const applyIconSet = (
  set: IconSetName,
  weight: IconWeight,
  material: MaterialOptions = { style: 'outlined', filled: false },
  lucide: LucideOptions = { strokeWidth: 2, absoluteStrokeWidth: false },
): void => {
  const materialSet =
    MATERIAL_VARIANTS[materialVariantKey(material.style, material.filled)] ??
    MATERIAL_VARIANTS.outlined;
  applySetToMap(ASSET_MAP, ORIGINAL_ASSETS, set, weight, materialSet, lucide);
  applySetToMap(
    ESM_ASSET_MAP,
    ORIGINAL_ESM_ASSETS,
    set,
    weight,
    materialSet,
    lucide,
  );
  applySetToMap(
    CL_ASSET_MAP,
    ORIGINAL_CL_ASSETS,
    set,
    weight,
    materialSet,
    lucide,
  );
};

/** Restore the design system's own icons app-wide. */
export const restoreIconSet = (): void => {
  applyIconSet('design-system', 'regular');
};

/**
 * Homepage, trade sheet, and Perps home can all be "focused" in overlapping
 * windows. Restore only when the last host releases so opening TradeWalletActions
 * does not flash design-system glyphs.
 */
let phosphorRegularRetainCount = 0;

export const retainPhosphorRegular = (): void => {
  phosphorRegularRetainCount += 1;
  applyIconSet('phosphor', 'regular');
};

export const releasePhosphorRegular = (): void => {
  phosphorRegularRetainCount = Math.max(0, phosphorRegularRetainCount - 1);
  if (phosphorRegularRetainCount === 0) {
    restoreIconSet();
  }
};

export type { MaterialStyle };
export { MATERIAL_STYLES } from './material';
