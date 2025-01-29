import {
  ButtonElement,
  ButtonProps,
  JSXElement,
} from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { NonEmptyArray } from '@metamask/utils';
import { mapTextToTemplate } from '../utils';
import { UIComponentFactory } from './types';
import { TextVariant } from '../../../../../component-library/components/Texts/Text';

interface ButtonElementProps extends ButtonElement {
  props: ButtonProps & {
    loading?: boolean;
    size?: 'sm' | 'md';
  };
}

export const button: UIComponentFactory<ButtonElementProps> = ({
  element,
  ...params
}) => {
  return {
    element: 'Button',
    props: {
      type: element.type,
      form: element.props.form,
      variant: element.props.variant,
      name: element.props.name,
      disabled: element.props.disabled,
      loading: element.props.loading ?? false,
      label: element.props.children,
      textVariant:
        element.props.size === 'sm' ? TextVariant.BodySM : TextVariant.BodyMD,
    },
    children: mapTextToTemplate(
      getJsxChildren(element) as NonEmptyArray<string | JSXElement>,
      params,
    ),
  };
};
