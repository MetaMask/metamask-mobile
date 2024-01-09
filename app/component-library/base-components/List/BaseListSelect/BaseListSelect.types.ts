// External dependencies.
import { BaseListItemSelectProps } from '../../ListItem/BaseListItemSelect/BaseListItemSelect.types';
import { BaseListProps } from '../BaseList/BaseList.types';

/**
 * BaseListSelect component props.
 */
export type BaseListSelectProps = BaseListProps & {
  options: BaseListItemSelectProps[];
  selectedOption?: BaseListItemSelectProps;
};
