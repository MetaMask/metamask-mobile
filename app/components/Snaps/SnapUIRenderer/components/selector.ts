import {
  JSXElement,
  SelectorElement,
  SelectorOptionElement,
} from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';

import { mapToTemplate } from '../utils';
import { UIComponentFactory } from './types';

export const selector: UIComponentFactory<SelectorElement> = ({
  element: e,
  form,
  ...params
}) => {
  const children = getJsxChildren(e) as SelectorOptionElement[];

  const options = children.map((child) => ({
    value: child.props.value,
    disabled: child.props.disabled,
  }));

  const optionComponents = children.map((child) =>
    mapToTemplate({
      ...params,
      form,
      element: child.props.children as JSXElement,
    }),
  );

  return {
    element: 'SnapUISelector',
    props: {
      id: e.props.name,
      name: e.props.name,
      title: e.props.title,
      disabled: e.props.disabled,
      form,
      options,
    },
    propComponents: {
      optionComponents,
    },
  };
};
