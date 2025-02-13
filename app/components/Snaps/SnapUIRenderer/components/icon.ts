/* eslint-disable @typescript-eslint/no-shadow */
import { IconElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';
import {
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';
import { IconColor } from '../utils';

const ICON_NAMES = new Set(Object.values(IconName));

export const icon: UIComponentFactory<IconElement> = ({ element }) => {
  const getIconName = () => {
    if (ICON_NAMES.has(element.props.name as IconName)) {
      return element.props.name as IconName;
    }
    return IconName.Danger;
  };

  const getIconColor = () => {
    switch (element.props.color) {
      case 'muted':
        return IconColor.iconMuted;
      case 'primary':
        return IconColor.primaryDefault;
      default:
        return IconColor.iconDefault;
    }
  };

  const getIconSize = () => {
    switch (element.props.size) {
      case 'md':
        return IconSize.Md;
      default:
        return IconSize.Inherit;
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
