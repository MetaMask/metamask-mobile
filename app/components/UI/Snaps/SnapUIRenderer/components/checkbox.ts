/* eslint-disable @typescript-eslint/no-shadow */

import { CheckboxElement } from '@metamask/snaps-sdk/jsx';

import { UIComponentFactory } from './types';
import { CheckboxProps } from '../../../../../component-library/components/Checkbox/Checkbox.types';

type ExtendedCheckboxProps = CheckboxProps & Record<string, unknown>;


export const checkbox: UIComponentFactory<CheckboxElement> = ({
  element,
}) => ({
  element: 'Checkbox',
  props: {
    name: element.props.name,
    label: element.props.label,
    variant: element.props.variant,
    isChecked: element.props.checked,
    ...element.props as ExtendedCheckboxProps,
  },
});
