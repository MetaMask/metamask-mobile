/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import { ListItemProps } from '../../ListItem/ListItem/ListItem.types';
import ListItem from '../../ListItem/ListItem';
import BaseListMultiSelect from '../../../base-components/List/BaseListMultiSelect';

// Internal dependencies.
import styleSheet from './ListMultiSelect.styles';
import { ListMultiSelectProps } from './ListMultiSelect.types';

const ListMultiSelect: React.FC<ListMultiSelectProps> = ({
  options = [],
  ...props
}) => {
  const { styles } = useStyles(styleSheet, {});
  const renderListItem = (optionProps: ListItemProps) => (
    <ListItem style={styles.listItem} {...optionProps} />
  );

  const transformedOptions = options.map((optionProps) => ({
    isSelected: false,
    isDisabled: false,
    children: renderListItem(optionProps),
  }));
  return <BaseListMultiSelect {...props} options={transformedOptions} />;
};

export default ListMultiSelect;
