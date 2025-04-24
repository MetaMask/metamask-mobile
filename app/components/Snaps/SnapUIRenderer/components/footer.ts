import {
  FooterElement,
  ButtonElement,
  JSXElement,
} from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { UIComponent, UIComponentFactory } from './types';
import { TemplateConfirmation } from '../../SnapDialogApproval/SnapDialogApproval';
import { ButtonVariants } from '../../../../component-library/components/Buttons/Button';
import { mapTextToTemplate } from '../utils';
import { NonEmptyArray } from '@metamask/utils';

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
  ).map((child, index) => {
    const textChildren = mapTextToTemplate(
      getJsxChildren(child) as NonEmptyArray<string | JSXElement>,
      // We specifically use inherit here because we know this will be nested in colored Text.
      { ...params, textColor: 'inherit' },
    );

    return {
      element: 'SnapUIFooterButton',
      key: `snap-footer-button-${child.props?.name ?? index}`,
      props: {
        form: child.props.form,
        type: child.props.type,
        name: child.props.name,
        disabled: child.props.disabled,
        loading: child.props.loading ?? false,
        snapVariant: child.props.variant,
        variant:
          providedChildren.length === 2 && index === 0
            ? ButtonVariants.Secondary
            : ButtonVariants.Primary,
        isSnapAction: true,
        onCancel,
      },
      children: textChildren,
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
