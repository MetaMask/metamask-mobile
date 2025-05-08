import { CheckboxElement } from '@metamask/snaps-sdk/jsx';

import { UIComponentFactory } from './types';

export const checkbox: UIComponentFactory<CheckboxElement> = ({
  element: e,
  form,
}) => ({
  element: 'SnapUICheckbox',
  props: {
    name: e.props.name,
    label: e.props.label,
    variant: e.props.variant,
    disabled: e.props.disabled,
    form,
  },
});
