/**
 * ICON SET OVERRIDE — temporary scratch module.
 *
 * Swaps the design system's icon lookup table at runtime so that EVERY
 * component rendering a DS `Icon` picks up a different library, with no
 * per-component wiring.
 *
 * How it works: `Icon.cjs` reads `assetByIconName[name]` at render time, and
 * that map is a plain unfrozen object. Reassigning its entries therefore
 * redirects every icon in the app on the next render.
 *
 * Two notes on the import below:
 * It is a RELATIVE FILE path, not a package specifier, because
 * `assetByIconName` is not in the package's `exports` map and Metro runs with
 * `unstable_enablePackageExports`.
 *
 * It targets `.cjs` deliberately. Metro resolves this package through the
 * `require` condition, so `.cjs` is the instance the real `Icon` uses;
 * importing `.mjs` would mutate a different copy and silently do nothing.
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
import type { IconWeight } from 'phosphor-react-native';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error -- deep relative import into the design system CJS build; see above.
import { assetByIconName } from '../../../../../node_modules/@metamask/design-system-react-native/dist/components/Icon/Icon.assets.cjs';

type IconComponent = React.ComponentType<Record<string, unknown>>;

/** DS names whose Phosphor equivalent is named differently. */
const PHOSPHOR_ALIASES: Record<string, string> = {
  Add: 'Plus',
  Campaign: 'Megaphone',
  Candlestick: 'ChartLine',
  Category: 'SquaresFour',
  Close: 'X',
  Confirmation: 'CheckCircle',
  Danger: 'WarningCircle',
  Edit: 'PencilSimple',
  Flash: 'Lightning',
  Global: 'Globe',
  Home: 'House',
  Info: 'Info',
  Lock: 'Lock',
  Menu: 'List',
  MoreHorizontal: 'DotsThree',
  MoreVertical: 'DotsThreeVertical',
  Notification: 'Bell',
  Question: 'Question',
  Refresh: 'ArrowsClockwise',
  Search: 'MagnifyingGlass',
  Security: 'ShieldCheck',
  Send: 'PaperPlaneTilt',
  Setting: 'Gear',
  SettingFilled: 'GearFine',
  Share: 'ShareNetwork',
  Speedometer: 'Gauge',
  StarFilled: 'StarFill',
  SwapHorizontal: 'ArrowsLeftRight',
  SwapVertical: 'ArrowsDownUp',
  LockSlash: 'LockOpen',
  WalletFilled: 'WalletFill',
  Warning: 'Warning',
};

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

const resolvePhosphor = (dsName: string): IconComponent | undefined => {
  const base = PHOSPHOR_ALIASES[dsName] ?? dsName;
  return PHOSPHOR_REGISTRY[`${base}Icon`] ?? PHOSPHOR_REGISTRY[base];
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

/** Pristine copy, captured once at module load, for restoring. */
const ORIGINAL_ASSETS: Record<string, IconComponent> = { ...ASSET_MAP };

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
  const Adapted = ({ style, ...rest }: AdaptedProps) => {
    const flat = StyleSheet.flatten(style) as FlatIconStyle | undefined;
    return (
      <PhosphorIcon
        {...rest}
        style={style}
        size={flat?.width ?? 24}
        color={flat?.color ?? 'currentColor'}
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

export const applyIconSet = (
  set: IconSetName,
  weight: IconWeight,
  material: MaterialOptions = { style: 'outlined', filled: false },
  lucide: LucideOptions = { strokeWidth: 2, absoluteStrokeWidth: false },
): void => {
  const materialSet =
    MATERIAL_VARIANTS[materialVariantKey(material.style, material.filled)] ??
    MATERIAL_VARIANTS.outlined;
  ALL_DS_ICON_NAMES.forEach((name) => {
    // Guard: an unmapped or missing entry must never reach React as
    // `undefined`, which renders as "Element type is invalid".
    if (!ORIGINAL_ASSETS[name]) {
      return;
    }
    if (set === 'material') {
      const svg = materialSet[name];
      ASSET_MAP[name] = svg ? adaptMaterial(svg) : ORIGINAL_ASSETS[name];
      return;
    }
    if (set === 'phosphor') {
      const icon = PHOSPHOR_BY_DS_NAME[name];
      ASSET_MAP[name] = icon
        ? adaptPhosphor(icon, weight)
        : ORIGINAL_ASSETS[name];
      return;
    }
    if (set === 'lucide') {
      const icon = LUCIDE_BY_DS_NAME[name];
      ASSET_MAP[name] = icon
        ? adaptLucide(icon, lucide.strokeWidth, lucide.absoluteStrokeWidth)
        : ORIGINAL_ASSETS[name];
      return;
    }
    ASSET_MAP[name] = ORIGINAL_ASSETS[name];
  });
};

/** Restore the design system's own icons app-wide. */
export const restoreIconSet = (): void => {
  applyIconSet('design-system', 'regular');
};

export type { MaterialStyle };
export { MATERIAL_STYLES } from './material';
