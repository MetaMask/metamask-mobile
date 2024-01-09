/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../hooks';
import { ListItemProps } from '../../ListItem/ListItem/ListItem.types';
import ListItem from '../../ListItem/ListItem';
import BaseListSelect from '../../../base-components/List/BaseListSelect';

// Internal dependencies.
import styleSheet from './ListSelect.styles';
import { ListSelectProps } from './ListSelect.types';

const ListSelect: React.FC<ListSelectProps> = ({ options = [], ...props }) => {
  const { styles } = useStyles(styleSheet, {});
  const renderListItem = (optionProps: ListItemProps) => (
    <ListItem style={styles.listItem} {...optionProps} />
  );

  const transformedOptions = options.map((optionProps) => ({
    isSelected: false,
    isDisabled: false,
    children: renderListItem(optionProps),
  }));
  return <BaseListSelect {...props} options={transformedOptions} />;
};

export default ListSelect;
