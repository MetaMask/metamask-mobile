import {
  IconName,
  type ButtonIconProps,
} from '@metamask/design-system-react-native';
import type {
  NativeStackHeaderItem,
  NativeStackHeaderItemButton,
} from '@react-navigation/native-stack';

import { strings } from '../../../../locales/i18n';
import type { HeaderStandardGlassProps } from './HeaderStandardGlass';

type SfSymbolName = Extract<
  NonNullable<NativeStackHeaderItemButton['icon']>,
  { type: 'sfSymbol' }
>['name'];

/** MMDS icons with a matching SF Symbol for native bar buttons. */
const SF_SYMBOLS: Partial<Record<IconName, SfSymbolName>> = {
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
  const symbol = SF_SYMBOLS[props.iconName];
  if (!symbol) {
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
    label: props.accessibilityLabel ?? props.iconName,
    isDisabled: props.isDisabled === true,
  };
};

/**
 * The header as a native bar config, or `undefined` when the header has
 * content the native bar cannot draw (a subtitle, custom accessories, a
 * non-text title or an icon with no SF Symbol). Those keep the JS header.
 */
export const getNativeHeaderConfig = ({
  title,
  subtitle,
  children,
  startAccessory,
  endAccessory,
  startButtonIconProps,
  endButtonIconProps = [],
  onBack,
  backButtonProps,
  onClose,
  closeButtonProps,
}: HeaderStandardGlassProps): NativeHeaderConfig | undefined => {
  if (
    typeof title !== 'string' ||
    subtitle ||
    children ||
    startAccessory ||
    endAccessory
  ) {
    return undefined;
  }

  const startProps: ButtonIconProps | undefined =
    startButtonIconProps ??
    (onBack || backButtonProps
      ? {
          iconName: IconName.ArrowLeft,
          accessibilityLabel: strings('navigation.back'),
          ...backButtonProps,
          onPress: backButtonProps?.onPress ?? onBack,
        }
      : undefined);

  // As in MMDS, close comes first and the first icon sits rightmost.
  const endProps: ButtonIconProps[] =
    onClose || closeButtonProps
      ? [
          {
            iconName: IconName.Close,
            accessibilityLabel: strings('navigation.close'),
            ...closeButtonProps,
            onPress: closeButtonProps?.onPress ?? onClose,
          },
          ...endButtonIconProps,
        ]
      : endButtonIconProps;

  const handlers: Record<string, () => void> = {};
  const left: NativeHeaderButton[] = [];
  if (startProps) {
    const start = toButton(
      startProps,
      startProps.iconName === IconName.ArrowLeft
        ? 'header-back'
        : `header-${startProps.iconName}`,
      handlers,
    );
    if (!start) {
      return undefined;
    }
    left.push(start);
  }

  const right: NativeHeaderButton[] = [];
  for (const [index, props] of endProps.entries()) {
    const identifier = `header-${props.iconName}`;
    const button = toButton(
      props,
      right.some((item) => item.identifier === identifier)
        ? `${identifier}-${index}`
        : identifier,
      handlers,
    );
    if (!button) {
      return undefined;
    }
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
