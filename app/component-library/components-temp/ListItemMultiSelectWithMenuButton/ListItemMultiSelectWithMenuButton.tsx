/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { TouchableOpacity, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';
import ListItem from '../../../component-library/components/List/ListItem/ListItem';
import Checkbox from '../../components/Checkbox';

// Internal dependencies.
import styleSheet from './ListItemMultiSelectWithMenuButton.styles';
import { ListItemMultiSelectWithMenuButtonProps } from './ListItemMultiSelectWithMenuButton.types';
import {
  BUTTON_TEST_ID,
  DEFAULT_LIST_ITEM_MULTISELECT_WITH_MENU_BUTTON_GAP,
} from './ListItemMultiSelectWithMenuButton.constants';
import ButtonIcon from '../../../component-library/components/Buttons/ButtonIcon';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';

const ListItemMultiSelectWithMenuButton: React.FC<
  ListItemMultiSelectWithMenuButtonProps
> = ({
  style,
  isSelected = false,
  isDisabled = false,
  children,
  gap = DEFAULT_LIST_ITEM_MULTISELECT_WITH_MENU_BUTTON_GAP,
  showButtonIcon = true,
  buttonIcon = IconName.MoreVertical,
  buttonProps,
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
        onLongPress={props.onLongPress}
        {...props}
      >
        <ListItem gap={gap} style={styles.containerColumn}>
          <Checkbox isChecked={isSelected} onPressIn={props.onPress} />
          {children}
        </ListItem>
      </TouchableOpacity>
      {showButtonIcon ? (
        <View style={styles.buttonIcon}>
          <ButtonIcon
            iconName={buttonIcon}
            iconColor={IconColor.Default}
            testID={buttonProps?.buttonTestId || BUTTON_TEST_ID}
            onPress={buttonProps?.onButtonClick as () => void}
            accessibilityRole="button"
          />
        </View>
      ) : null}
    </View>
  );
};

export default ListItemMultiSelectWithMenuButton;
