import { AddressElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';

export const address: UIComponentFactory<AddressElement> = ({
  element: e,
}) => ({
  element: 'SnapUIAddress',
  props: {
    address: e.props.address,
    avatarSize: 'xs',
    truncate: e.props.truncate,
    displayName: e.props.displayName,
    avatar: e.props.avatar,
  },
});
