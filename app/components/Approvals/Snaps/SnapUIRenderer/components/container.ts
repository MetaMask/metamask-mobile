import { BoxElement, JSXElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { mapToTemplate } from '../utils';
import { UIComponentFactory } from './types';

export const container: UIComponentFactory<BoxElement> = ({
  element,
  useFooter,
  onCancel,
  promptLegacyProps,
  t,
  ...params
}) => {
  const children = getJsxChildren(element);

  if (!useFooter && children.length === 2) {
    children.pop();
  }

  const templateChildren = children.map((child) =>
    mapToTemplate({
      onCancel,
      t,
      ...params,
      element: child as JSXElement,
    }),
  );

  if (promptLegacyProps) {
    templateChildren.push({
      element: 'FormTextField',
      key: 'snap-prompt-input',
      props: {
        style: { marginHorizontal: 4 },
        className: 'snap-prompt-input',
        value: promptLegacyProps.inputValue,
        onChangeText: promptLegacyProps.onInputChange,
        placeholder: promptLegacyProps.placeholder,
        maxLength: 300,
      },
    });
  }

  if (useFooter && onCancel && !children[1]) {
    templateChildren.push({
      props: {
        style: { alignItems: 'center' },
      },
      children: {
        element: 'SnapFooterButton',
        key: 'default-button',
        props: {
          onCancel,
          isSnapAction: false,
        },
        children: t('close'),
      },
      element: '',
    });
  }

  return {
    element: 'View',
    children: templateChildren,
    props: {
      style: {
        flex: 1,
        flexDirection: 'column',
      },
      className: 'snap-ui-renderer__container',
    },
  };
};
