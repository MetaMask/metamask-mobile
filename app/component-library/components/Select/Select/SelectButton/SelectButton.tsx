/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';

// External dependencies.
import { useStyles } from '../../../../hooks';
import Avatar from '../../../Avatars/Avatar/Avatar';
import BaseSelectButton from '../../../../base-components/Select/BaseSelectButton';
import ListItem from '../../../ListItem/ListItem';
import { ListItemProps } from '../../../ListItem/ListItem/ListItem.types';

// Internal dependencies.
import styleSheet from './SelectButton.styles';
import { SelectButtonProps } from './SelectButton.types';
import {
  DEFAULT_SELECTBUTTON_GAP,
  DEFAULT_SELECTBUTTON_VERTICALALIGNMENT,
  DEFAULT_SELECTBUTTON_SIZE,
  STARTICON_ICONSIZE_BY_SELECTBUTTONSIZE,
  SELECTBUTTON_TESTID,
} from './SelectButton.constants';

const SelectButton: React.FC<SelectButtonProps> = ({
  style,
  size = DEFAULT_SELECTBUTTON_SIZE,
  value,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
  });
  const renderStartAccessory = (providedValue: ListItemProps) => {
    if (providedValue.startAccessory) {
      return providedValue.startAccessory;
    } else if (providedValue.iconEl) {
      return React.cloneElement(providedValue.iconEl, {
        ...providedValue.iconEl.props,
        size: STARTICON_ICONSIZE_BY_SELECTBUTTONSIZE[size],
      });
    } else if (providedValue.iconProps) {
      return (
        <Avatar
          {...providedValue.iconProps}
          size={STARTICON_ICONSIZE_BY_SELECTBUTTONSIZE[size]}
        />
      );
    }
  };

  return (
    <BaseSelectButton
      style={styles.base}
      testID={SELECTBUTTON_TESTID}
      {...props}
    >
      {value && (
        <ListItem
          gap={DEFAULT_SELECTBUTTON_GAP}
          verticalAlignment={DEFAULT_SELECTBUTTON_VERTICALALIGNMENT}
          {...value}
          startAccessory={renderStartAccessory(value)}
          style={styles.value}
        />
      )}
    </BaseSelectButton>
  );
};

export default SelectButton;
