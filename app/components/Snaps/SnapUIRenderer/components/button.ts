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
  element: e,
  ...params
}) => ({
  element: 'SnapUIButton',
  props: {
    type: e.props.type,
    // This differs from the extension implementation because we don't have proper form support on RN
    form: e.props.form ?? params.form,
    variant: e.props.variant,
    name: e.props.name,
    disabled: e.props.disabled,
    loading: e.props.loading ?? false,
    textVariant:
      e.props.size === 'sm'
        ? TextVariant.BodySMMedium
        : TextVariant.BodyMDMedium,
  },
  children: mapTextToTemplate(
    getJsxChildren(e) as NonEmptyArray<string | JSXElement>,
    params,
  ),
});
