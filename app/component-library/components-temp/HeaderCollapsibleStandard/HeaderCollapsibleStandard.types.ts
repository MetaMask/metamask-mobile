// Third party dependencies.
import { ReactNode } from 'react';

// Internal dependencies.
import { HeaderCollapsibleProps } from '../HeaderCollapsible/HeaderCollapsible.types';
import { TitleStandardProps } from '../TitleStandard/TitleStandard.types';

/**
 * HeaderCollapsibleStandard component props.
 */
export interface HeaderCollapsibleStandardProps
  extends Omit<HeaderCollapsibleProps, 'expandedContent'> {
  /**
   * Custom node to render in the expanded content section.
   * If provided, takes priority over titleStandardProps.
   */
  titleStandard?: ReactNode;
  /**
   * Props to pass to the TitleStandard component.
   * Only used if titleStandard is not provided.
   */
  titleStandardProps?: TitleStandardProps;
  /**
   * Test ID for the title section wrapper.
   */
  titleSectionTestID?: string;
}
