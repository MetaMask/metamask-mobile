/* eslint-disable @typescript-eslint/no-shadow */
import { IconElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';
import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';

const ICON_NAMES = new Set(Object.values(IconName));

export const icon: UIComponentFactory<IconElement> = ({ element, size }) => {
  const getIconName = () => {
    const rawName = element.props.name;
    // The icon names are formatted differently between extension and mobile,
    // so we attempt to map from extension to the mobile format here.
    const mappedName = rawName
      .split('-')
      .map((str) => str.charAt(0).toUpperCase() + str.slice(1))
      .join('') as IconName;
    if (ICON_NAMES.has(mappedName)) {
      return mappedName;
    }
    return IconName.Danger;
  };

  const getIconColor = () => {
    switch (element.props.color) {
      case 'muted':
        return IconColor.Muted;
      case 'primary':
        return IconColor.Primary;
      default:
        return IconColor.Default;
    }
  };

  const getIconSize = () => {
    switch (element.props.size ?? size) {
      case 'md':
        return IconSize.Md;
      default:
        return IconSize.Sm;
    }
  };

  return {
    element: 'SnapUIIcon',
    props: {
      name: getIconName(),
      color: getIconColor(),
      size: getIconSize(),
    },
  };
};
