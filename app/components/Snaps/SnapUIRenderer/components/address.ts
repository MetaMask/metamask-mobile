import { AddressElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';
import { AvatarSize } from '../../../../component-library/components/Avatars/Avatar';

export const address: UIComponentFactory<AddressElement> = ({
  element: e,
  textColor,
}) => ({
  element: 'SnapUIAddress',
  props: {
    address: e.props.address,
    avatarSize: AvatarSize.Xs,
    truncate: e.props.truncate,
    displayName: e.props.displayName,
    avatar: e.props.avatar,
    color: textColor,
  },
});
