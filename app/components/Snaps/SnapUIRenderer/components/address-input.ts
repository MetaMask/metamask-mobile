import { AddressInputElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';

export const addressInput: UIComponentFactory<AddressInputElement> = ({
  element: e,
  form,
}) => ({
  element: 'SnapUIAddressInput',
  props: {
    name: e.props.name,
    form,
    chainId: e.props.chainId,
    displayAvatar: e.props.displayAvatar,
    disabled: e.props.disabled,
    placeholder: e.props.placeholder,
  },
});
