import { AvatarElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';

export const avatar: UIComponentFactory<AvatarElement> = ({ element: e }) => ({
  element: 'SnapUIAvatar',
  props: {
    address: e.props.address,
    size: e.props.size,
  },
});
