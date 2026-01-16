/* eslint-disable react/prop-types */

// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import TouchableOpacity from '../../../components/Base/TouchableOpacity';
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
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../component-library/components/Buttons/Button';
import { TextVariant } from '../../../component-library/components/Texts/Text';

const ListItemMultiSelectButton: React.FC<ListItemMultiSelectButtonProps> = ({
  style,
  isSelected = false,
  isDisabled = false,
  children,
  gap = DEFAULT_LISTITEMMULTISELECT_GAP,
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
        onLongPress={props.onPress}
        {...props}
      >
        <ListItem gap={gap} style={styles.containerColumn}>
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
      {buttonProps?.textButton ? (
        <View>
          <Button
            variant={ButtonVariants.Link}
            onPress={buttonProps?.onButtonClick as () => void}
            labelTextVariant={TextVariant.BodyMD}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Auto}
            label={buttonProps?.textButton}
          />
        </View>
      ) : null}
    </View>
  );
};

export default ListItemMultiSelectButton;
