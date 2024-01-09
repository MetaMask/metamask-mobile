// External dependencies.
import { ListItemProps } from '../../../ListItem/ListItem/ListItem.types';
import { BaseSelectWrapperProps } from '../../../../base-components/Select/BaseSelectWrapper/BaseSelectWrapper.types';

/**
 * SelectWrapper component props.
 */
export interface SelectWrapperProps extends BaseSelectWrapperProps {
  value?: ListItemProps;
}
