import { FooterElement, ButtonElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { UIComponent, UIComponentFactory, UIComponentParams } from './types';
import { button as buttonFn } from './button';
import { TemplateConfirmation } from '../../SnapDialogApproval/SnapDialogApproval';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';

export const DEFAULT_FOOTER = {
  element: 'Box',
  key: 'default-footer',
  props: {
    flexDirection: 'row',
    gap: 16,
    padding: 16,
    style: {
      position: 'absolute',
      bottom: 0,
      width: '100%',
      justifyContent: 'space-evenly',
      paddingVertical: 16,
      height: 80,
    },
  },
};

const getDefaultButtons = (
  footer: FooterElement,
  t: (value: string) => string,
  onCancel?: () => void,
) => {
  const children = getJsxChildren(footer);

  // If onCancel is omitted by the caller we assume that it is safe to not display the default footer.
  if (children.length === 1 && onCancel) {
    return {
      element: 'SnapUIFooterButton',
      key: 'default-button',
      props: {
        onCancel,
        variant: ButtonVariants.Secondary,
        isSnapAction: false,
      },
      children: t(TemplateConfirmation.CANCEL),
    };
  }

  return undefined;
};

export const footer: UIComponentFactory<FooterElement> = ({
  element: e,
  t,
  onCancel,
  ...params
}) => {
  const defaultButtons = getDefaultButtons(e, t, onCancel);
  const providedChildren = getJsxChildren(e);

  const footerChildren: UIComponent[] = (
    providedChildren as ButtonElement[]
  ).map((children, index) => {
    const buttonMapped = buttonFn({
      ...params,
      t,
      element: children,
      onCancel,
    } as UIComponentParams<ButtonElement>);

    return {
      element: 'SnapUIFooterButton',
      key: `snap-footer-button-${buttonMapped.props?.name ?? index}`,
      props: {
        ...buttonMapped.props,
        variant:
          providedChildren.length === 2 && index === 0
            ? ButtonVariants.Secondary
            : ButtonVariants.Primary,
        isSnapAction: true,
        onCancel,
      },
      children: buttonMapped.children,
    };
  });

  if (defaultButtons) {
    footerChildren.unshift(defaultButtons as UIComponent);
  }

  return {
    ...DEFAULT_FOOTER,
    children: footerChildren,
  };
};
