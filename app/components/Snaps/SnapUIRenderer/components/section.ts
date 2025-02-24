import { SectionElement, BoxElement } from '@metamask/snaps-sdk/jsx';
import { UIComponentFactory, UIComponentParams } from './types';
import { box } from './box';

export const section: UIComponentFactory<SectionElement> = ({
  element,
  theme,
  ...params
}) => {
  const { children, props } = box({
    element,
    ...params,
  } as unknown as UIComponentParams<BoxElement>);

  return {
    element: 'Box',
    children,
    props: {
      ...props,
      padding: 4,
      gap: 2,
      // This is meant to be the inverse color of the container background.
      // TODO: Support multiple background colors.
      backgroundColor: theme.colors.background.alternative,
      borderRadius: 8,
    },
  };
};
