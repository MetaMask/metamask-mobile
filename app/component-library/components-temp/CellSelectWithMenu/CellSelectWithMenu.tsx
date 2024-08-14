/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';
import { TouchableOpacity, TouchableWithoutFeedback } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';

// Internal dependencies.
import styleSheet from './CellSelectWithMenu.styles';
import { CellSelectWithMenuProps } from './CellSelectWithMenu.types';
import { CellModalSelectorsIDs } from '../../../../e2e/selectors/Modals/CellModal.selectors';
import ListItemMultiSelectButton from '../ListItemMultiSelectButton/ListItemMultiSelectButton';
import { View } from 'react-native-animatable';
import Avatar from '../../../component-library/components/Avatars/Avatar';
import Text from '../../../component-library/components/Texts/Text';
import {
  DEFAULT_CELLBASE_AVATAR_SECONDARYTEXT_TEXTVARIANT,
  DEFAULT_CELLBASE_AVATAR_SIZE,
  DEFAULT_CELLBASE_AVATAR_TITLE_TEXTVARIANT,
} from '../../../component-library/components/Cells/Cell/foundation/CellBase/CellBase.constants';
import Icon, {
  IconName,
  IconSize,
} from '../../../component-library/components/Icons/Icon';

const CellSelectWithMenu = ({
  style,
  avatarProps,
  title,
  secondaryText,
  tertiaryText,
  tagLabel,
  isSelected = false,
  children,
  ...props
}: CellSelectWithMenuProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <ListItemMultiSelectButton
      isSelected={isSelected}
      style={styles.base}
      testID={CellModalSelectorsIDs.MULTISELECT}
      {...props}
    >
      <View style={styles.cellBase}>
        {/* DEV Note: Account Avatar should be replaced with Avatar with Badge whenever available */}
        <Avatar
          style={styles.avatar}
          testID={CellModalSelectorsIDs.BASE_AVATAR}
          size={DEFAULT_CELLBASE_AVATAR_SIZE}
          {...avatarProps}
        />
        <View style={styles.cellBaseInfo}>
          <Text
            numberOfLines={1}
            variant={DEFAULT_CELLBASE_AVATAR_TITLE_TEXTVARIANT}
            testID={CellModalSelectorsIDs.BASE_TITLE}
          >
            {title}
          </Text>
          {!!secondaryText && (
            <TouchableWithoutFeedback>
              <TouchableOpacity
                style={styles.containerRow}
                onPress={props.onTextClick}
              >
                <Text
                  numberOfLines={1}
                  variant={DEFAULT_CELLBASE_AVATAR_SECONDARYTEXT_TEXTVARIANT}
                  style={styles.secondaryText}
                >
                  {secondaryText}
                </Text>
                <Icon
                  name={IconName.ArrowDown}
                  size={IconSize.Xss}
                  style={styles.arrowStyle}
                />
              </TouchableOpacity>
            </TouchableWithoutFeedback>
          )}
        </View>
        {children && <View style={styles.optionalAccessory}>{children}</View>}
      </View>
    </ListItemMultiSelectButton>
  );
};

export default CellSelectWithMenu;
