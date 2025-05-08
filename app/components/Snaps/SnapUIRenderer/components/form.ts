import { FormElement, JSXElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { mapToTemplate } from '../utils';
import { UIComponent, UIComponentFactory } from './types';
import { FlexDirection } from '../../../UI/Box/box.types';

export const form: UIComponentFactory<FormElement> = ({
  element: e,
  ...params
}) => ({
  // The Form is just a Box that does nothing on mobile.
  element: 'Box',
  children: getJsxChildren(e).map((children) =>
    mapToTemplate({
      element: children as JSXElement,
      form: e.props.name,
      ...params,
    }),
  ) as NonEmptyArray<UIComponent>,
  props: {
    flexDirection: FlexDirection.Column,
    gap: 8,
  },
});
