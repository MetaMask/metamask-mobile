/* eslint-disable @typescript-eslint/no-shadow */
import { ButtonElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory } from './types';
import { ButtonProps } from '../../../../../component-library/components/Buttons/Button/Button.types';


type ExtendedButtonProps = ButtonProps & Record<string, unknown>;

export const Button: UIComponentFactory<ButtonElement> = ({ element }) => {

  const buttonProps: ExtendedButtonProps = {
    ...element.props as unknown as ExtendedButtonProps,
  };

  if (element.props.name) {
    buttonProps.label = element.props.children;
  }

  return {
    element: 'Button',
    props: buttonProps,
  };
};
