import { RadioGroupElement, RadioElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';

import { UIComponentFactory } from './types';

export const radioGroup: UIComponentFactory<RadioGroupElement> = ({
  element: e,
  form,
}) => {
  const children = getJsxChildren(e) as RadioElement[];

  const options = children.map((child) => ({
    value: child.props.value,
    name: child.props.children,
    disabled: child.props.disabled,
  }));

  return {
    element: 'SnapUIRadioGroup',
    props: {
      id: e.props.name,
      name: e.props.name,
      disabled: e.props.disabled,
      form,
      options,
    },
  };
};
