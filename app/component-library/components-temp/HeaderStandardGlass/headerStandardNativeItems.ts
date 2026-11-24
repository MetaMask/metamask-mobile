import {
  IconName,
  type ButtonIconProps,
} from '@metamask/design-system-react-native';
import type {
  NativeStackHeaderItem,
  NativeStackHeaderItemButton,
} from '@react-navigation/native-stack';

import { strings } from '../../../../locales/i18n';
import {
  resolveEndButtonIconProps,
  resolveStartButtonIconProps,
} from '../HeaderGlass/headerGlassAccessories';
import type { HeaderStandardGlassProps } from './HeaderStandardGlass';

type SfSymbolName = Extract<
  NonNullable<NativeStackHeaderItemButton['icon']>,
  { type: 'sfSymbol' }
>['name'];

// Built on first use: some screen tests mock MMDS without `IconName`.
let sfSymbols: Partial<Record<IconName, SfSymbolName>> | undefined;

/** The SF Symbol matching an MMDS icon, for native bar buttons. */
const getSfSymbol = (iconName: IconName): SfSymbolName | undefined => {
  sfSymbols ??= {
    [IconName.ArrowLeft]: 'chevron.backward',
    [IconName.Close]: 'xmark',
    [IconName.Search]: 'magnifyingglass',
    [IconName.Setting]: 'gearshape',
    [IconName.Info]: 'info.circle',
    [IconName.Question]: 'questionmark.circle',
    [IconName.Scan]: 'qrcode.viewfinder',
    [IconName.Trash]: 'trash',
    [IconName.Activity]: 'clock',
    [IconName.Notification]: 'bell',
    [IconName.Menu]: 'line.3.horizontal',
    [IconName.Add]: 'plus',
    [IconName.MoreVertical]: 'ellipsis',
    [IconName.MoreHorizontal]: 'ellipsis',
    [IconName.Share]: 'square.and.arrow.up',
    [IconName.Customize]: 'slider.horizontal.3',
    [IconName.Edit]: 'pencil',
    [IconName.Copy]: 'doc.on.doc',
  };
  return sfSymbols[iconName];
};

export interface NativeHeaderButton {
  /** Shared across screens, so UIKit morphs matching buttons on push and pop. */
  identifier: string;
  symbol: SfSymbolName;
  label: string;
  isDisabled: boolean;
}

export interface NativeHeaderConfig {
  title: string;
  left: NativeHeaderButton[];
  /** Left to right, as they appear on screen. */
  right: NativeHeaderButton[];
  /** Press handlers by button identifier. */
  handlers: Record<string, () => void>;
}

const toButton = (
  props: ButtonIconProps,
  identifier: string,
  handlers: Record<string, () => void>,
): NativeHeaderButton | undefined => {
  const symbol = getSfSymbol(props.iconName);
  const label = props.accessibilityLabel;
  if (!symbol || !label) {
    return undefined;
  }
  const { onPress } = props;
  if (onPress) {
    // Native bar buttons have no press event to pass on.
    handlers[identifier] = (): void => Reflect.apply(onPress, undefined, []);
  }
  return {
    identifier,
    symbol,
    label,
    isDisabled: props.isDisabled === true,
  };
};

const BACK_LABEL_KEY = 'navigation.back';
const CLOSE_LABEL_KEY = 'navigation.close';

/**
 * The header as a native bar config, or `undefined` when the header has
 * content the native bar cannot draw (a subtitle, custom accessories, a
 * non-text title, an icon with no SF Symbol, or a button with no
 * `accessibilityLabel` other than back and close). Those keep the JS header.
 * A header with no title gets an empty native title.
 */
export const getNativeHeaderConfig = (
  props: HeaderStandardGlassProps,
): NativeHeaderConfig | undefined => {
  const {
    title = '',
    subtitle,
    children,
    startAccessory,
    endAccessory,
  } = props;
  if (
    typeof title !== 'string' ||
    subtitle ||
    children ||
    startAccessory ||
    endAccessory
  ) {
    return undefined;
  }

  const handlers: Record<string, () => void> = {};

  const left: NativeHeaderButton[] = [];
  const startProps = resolveStartButtonIconProps(props);
  if (startProps) {
    const isBack = startProps.iconName === IconName.ArrowLeft;
    const start = toButton(
      {
        accessibilityLabel: isBack ? strings(BACK_LABEL_KEY) : undefined,
        ...startProps,
      },
      isBack ? 'header-back' : `header-start-${startProps.iconName}`,
      handlers,
    );
    if (!start) {
      return undefined;
    }
    left.push(start);
  }

  const right: NativeHeaderButton[] = [];
  for (const [index, endProps] of resolveEndButtonIconProps(props).entries()) {
    const identifier = `header-end-${endProps.iconName}`;
    const button = toButton(
      {
        accessibilityLabel:
          endProps.iconName === IconName.Close
            ? strings(CLOSE_LABEL_KEY)
            : undefined,
        ...endProps,
      },
      right.some((item) => item.identifier === identifier)
        ? `${identifier}-${index}`
        : identifier,
      handlers,
    );
    if (!button) {
      return undefined;
    }
    // As in MMDS, the first end icon sits rightmost.
    right.unshift(button);
  }

  return { title, left, right, handlers };
};

export const toNativeHeaderItems = (
  buttons: NativeHeaderButton[],
  onPress: (identifier: string) => void,
): NativeStackHeaderItem[] =>
  buttons.map((button) => ({
    type: 'button',
    identifier: button.identifier,
    label: button.label,
    accessibilityLabel: button.label,
    icon: { type: 'sfSymbol', name: button.symbol },
    disabled: button.isDisabled,
    onPress: () => onPress(button.identifier),
  }));
