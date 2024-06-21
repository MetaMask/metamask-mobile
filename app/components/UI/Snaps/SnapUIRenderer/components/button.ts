import { ButtonElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';
import { mapTextToTemplate } from '../utils';
import { getJsxChildren } from '@metamask/snaps-utils';

export const button: UIComponentFactory<ButtonElement> = ({
  element,
  ...params
}) => ({
  element: 'SnapUIButton',
  props: {
    type: element.props.type,
    variant: element.props.variant,
    name: element.props.name,
    disabled: element.props.disabled,
  },
  children: mapTextToTemplate(getJsxChildren(element), params),
});
