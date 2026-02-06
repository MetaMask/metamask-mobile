// Third party dependencies.
import { ReactNode } from 'react';

// Internal dependencies.
import { HeaderCollapsibleProps } from '../HeaderCollapsible/HeaderCollapsible.types';
import { TitleSubpageProps } from '../TitleSubpage/TitleSubpage.types';

/**
 * HeaderCollapsibleSubpage component props.
 */
export interface HeaderCollapsibleSubpageProps
  extends Omit<HeaderCollapsibleProps, 'expandedContent'> {
  /**
   * Custom node to render in the expanded content section.
   * If provided, takes priority over titleSubpageProps.
   */
  titleSubpage?: ReactNode;
  /**
   * Props to pass to the TitleSubpage component.
   * Only used if titleSubpage is not provided.
   */
  titleSubpageProps?: TitleSubpageProps;
  /**
   * Test ID for the title section wrapper.
   */
  titleSectionTestID?: string;
}
