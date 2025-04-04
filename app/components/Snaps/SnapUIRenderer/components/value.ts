import { ValueElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';

export const value: UIComponentFactory<ValueElement> = ({ element: e }) => ({
  element: 'ConfirmInfoRowValueDouble',
  props: {
    left: e.props.extra,
    right: e.props.value,
  },
});
