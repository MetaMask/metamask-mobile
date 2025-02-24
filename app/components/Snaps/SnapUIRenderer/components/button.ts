import {
  ButtonElement,
  ButtonProps,
  JSXElement,
} from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { mapTextToTemplate } from '../utils';
import { UIComponentFactory } from './types';
import { TextVariant } from '../../../../component-library/components/Texts/Text';

interface ButtonElementProps extends ButtonElement {
  props: ButtonProps & {
    loading?: boolean;
    size?: 'sm' | 'md';
  };
}

export const button: UIComponentFactory<ButtonElementProps> = ({
  element,
  ...params
}) => ({
  element: 'SnapUIButton',
  props: {
    type: element.props.type,
    // This differs from the extension implementation because we don't have proper form support on RN
    form: element.props.form ?? params.form,
    variant: element.props.variant,
    name: element.props.name,
    disabled: element.props.disabled,
    loading: element.props.loading ?? false,
    // TODO: This prop is currently not used.
    textVariant:
      element.props.size === 'sm' ? TextVariant.BodySMMedium : TextVariant.BodyMDMedium,
  },
  children: mapTextToTemplate(
    getJsxChildren(element) as NonEmptyArray<string | JSXElement>,
    params,
  ),
});
