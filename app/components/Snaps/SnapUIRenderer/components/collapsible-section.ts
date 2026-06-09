import { BoxElement, CollapsibleSectionElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory, UIComponentParams } from './types';
import { box } from './box';

export const collapsibleSection: UIComponentFactory<
  CollapsibleSectionElement
> = ({ element: e, theme, ...params }) => {
  const { children, props } = box({
    element: e,
    theme,
    ...params,
  } as unknown as UIComponentParams<BoxElement>);

  return {
    element: 'SnapUICollapsibleSection',
    children,
    props: {
      ...props,
      label: e.props.label,
      isLoading: e.props.isLoading,
      isExpanded: e.props.isExpanded,
      // This is meant to be the inverse color of the container background.
      // TODO: Support multiple background colors.
      backgroundColor: theme.colors.background.alternative,
    },
  };
};
