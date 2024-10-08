import { FooterElement, ButtonElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { UIComponentFactory } from './types';
import { ButtonProps, ButtonVariants } from '../../../../../component-library/components/Buttons/Button/Button.types';
import { ButtonsAlignment } from '../../../../../component-library/components/BottomSheets/BottomSheetFooter';

export const footer: UIComponentFactory<FooterElement> = ({
  element,
  t,
  onCancel,
}) => {
  const footerChildren = getJsxChildren(element) as ButtonElement[];

  const buttonPropsArray: ButtonProps[] = footerChildren.map((child) => {
    const { children: buttonChildren, ...props } = child.props;
    return {
      label: buttonChildren as string,
      variant: (props.variant as ButtonVariants) || ButtonVariants.Primary,
      onPress: () => {}, // Add a default empty function for onPress
      ...props,
    };
  });

  if (onCancel && buttonPropsArray.length === 1) {
    buttonPropsArray.unshift({
      label: t('cancel'),
      variant: ButtonVariants.Secondary,
      onPress: onCancel,
    });
  }

  return {
    element: 'BottomSheetFooter',
    props: {
      buttonPropsArray,
      buttonsAlignment: ButtonsAlignment.Horizontal,
    },
  };
};
