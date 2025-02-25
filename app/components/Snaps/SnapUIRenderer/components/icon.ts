/* eslint-disable @typescript-eslint/no-shadow */
import { IconElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';
import {
  IconColor,
  IconName,
  IconSize,
} from '../../../../component-library/components/Icons/Icon';

const ICON_NAMES = new Set(Object.values(IconName));

export const icon: UIComponentFactory<IconElement> = ({ element }) => {
  const getIconName = () => {
    // TODO: This will never succeed because all of the icons are named differently on mobile.
    if (ICON_NAMES.has(element.props.name as IconName)) {
      return element.props.name as IconName;
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
    switch (element.props.size) {
      case 'md':
        return IconSize.Md;
      default:
        return 'inherit';
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
