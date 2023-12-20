// Third party dependencies.
import { ViewProps } from 'react-native';

/**
 * ListSearchableBase component props.
 */
export interface ListSearchableBaseProps extends ViewProps {
  /**
   * Optional enum to replace the Search Input.
   */
  searchInputEl?: React.ReactNode;
  /**
   * Optional enum to replace the filtered list.
   */
  filteredListEl?: React.ReactNode;
}

/**
 * Style sheet ListSearchableBase parameters.
 */
export type ListSearchableBaseStyleSheetVars = Pick<
  ListSearchableBaseProps,
  'style'
>;
