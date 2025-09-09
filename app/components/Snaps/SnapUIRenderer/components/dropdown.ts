import { DropdownElement, OptionElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';

import { UIComponentFactory } from './types';

export const dropdown: UIComponentFactory<DropdownElement> = ({
  element: e,
  form,
}) => {
  const children = getJsxChildren(e) as OptionElement[];

  const options = children.map((child) => ({
    value: child.props.value,
    name: child.props.children,
    disabled: child.props.disabled,
  }));

  return {
    element: 'SnapUIDropdown',
    props: {
      id: e.props.name,
      name: e.props.name,
      disabled: e.props.disabled,
      form,
      options,
    },
  };
};
