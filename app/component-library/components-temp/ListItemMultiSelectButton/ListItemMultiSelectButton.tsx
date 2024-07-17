/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';
import ListItem from '../../../component-library/components/List/ListItem/ListItem';

// Internal dependencies.
import styleSheet from './ListItemMultiSelectButton.styles';
import { ListItemMultiSelectButtonProps } from './ListItemMultiSelectButton.types';
import {
  BUTTON_TEST_ID,
  DEFAULT_LISTITEMMULTISELECT_GAP,
} from './ListItemMultiSelectButton.constants';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';

const ListItemMultiSelectButton: React.FC<ListItemMultiSelectButtonProps> = ({
  style,
  isSelected = false,
  isDisabled = false,
  children,
  gap = DEFAULT_LISTITEMMULTISELECT_GAP,
  buttonIcon = IconName.MoreVertical,
  ...props
}) => {
  const { styles } = useStyles(styleSheet, {
    style,
    gap,
    isDisabled,
    isSelected,
  });

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.base}
        disabled={isDisabled}
        onPress={props.onPress}
        onLongPress={props.onPress}
        {...props}
      >
        <ListItem gap={gap} style={styles.listItem}>
          {children}
        </ListItem>
        {isSelected && (
          <View style={styles.underlay} accessibilityRole="checkbox" accessible>
            <View style={styles.underlayBar} />
          </View>
        )}
      </TouchableOpacity>
      <View>
        <ButtonIcon
          iconName={buttonIcon}
          iconColor={IconColor.Default}
          testID={BUTTON_TEST_ID}
          onPress={props.onButtonClick}
          accessibilityRole="button"
        />
      </View>
    </View>
  );
};

export default ListItemMultiSelectButton;
