// External dependencies.
import { BaseListItemMultiSelectProps } from '../../ListItem/BaseListItemMultiSelect/BaseListItemMultiSelect.types';
import { BaseListProps } from '../BaseList/BaseList.types';

/**
 * BaseListMultiSelect component props.
 */
export type BaseListMultiSelectProps = BaseListProps & {
  options: BaseListItemMultiSelectProps[];
};
