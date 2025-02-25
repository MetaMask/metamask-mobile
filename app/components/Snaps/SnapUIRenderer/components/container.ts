import { BoxElement, JSXElement } from '@metamask/snaps-sdk/jsx';
import { getJsxChildren } from '@metamask/snaps-utils';
import { mapToTemplate } from '../utils';
import { UIComponentFactory } from './types';

export const container: UIComponentFactory<BoxElement> = ({
  element: e,
  useFooter,
  onCancel,
  t,
  ...params
}) => {
  const children = getJsxChildren(e);

  if (!useFooter && children.length === 2) {
    children.pop();
  }

  const templateChildren = children.map((child) =>
    mapToTemplate({
      useFooter,
      onCancel,
      t,
      ...params,
      element: child as JSXElement,
    }),
  );

  if (useFooter && onCancel && !children[1]) {
    templateChildren.push({
      props: {
        style: { alignItems: 'center' },
      },
      children: {
        element: 'SnapUIFooterButton',
        key: 'default-button',
        props: {
          onCancel,
          isSnapAction: false,
        },
        children: t('close'),
      },
      element: 'Box',
    });
  }

  return {
    element: 'Box',
    children: templateChildren,
    props: {
      style: {
        flex: 1,
        flexDirection: 'column',
      },
    },
  };
};
