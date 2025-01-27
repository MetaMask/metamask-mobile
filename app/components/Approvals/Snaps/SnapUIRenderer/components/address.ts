/* eslint-disable @typescript-eslint/no-shadow */
import { AddressElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';
import { AddressElementProps } from '../../../../Views/confirmations/SendFlow/AddressElement/AddressElement.types';

type ExtendedAddressProps = AddressElementProps & Record<string, unknown>;

export const address: UIComponentFactory<AddressElement> = ({ element }) => ({
  element: 'AddressElement',
  props: element.props as ExtendedAddressProps,
});
