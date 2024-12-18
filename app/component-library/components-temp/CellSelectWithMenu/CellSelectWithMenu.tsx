/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';
import { TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';
import Tag from '../../../component-library/components/Tags/Tag';

// Internal dependencies.
import styleSheet from './CellSelectWithMenu.styles';
import { CellSelectWithMenuProps } from './CellSelectWithMenu.types';
import { CellComponentSelectorsIDs } from '../../../../e2e/selectors/wallet/CellComponent.selectors';
import ListItemMultiSelectButton from '../ListItemMultiSelectButton/ListItemMultiSelectButton';
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
  withAvatar = true,
  showSecondaryTextIcon = true,
  ...props
}: CellSelectWithMenuProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <ListItemMultiSelectButton
      isSelected={isSelected}
      style={styles.base}
      testID={CellComponentSelectorsIDs.MULTISELECT}
      {...props}
    >
      <View style={styles.cellBase}>
        {/* DEV Note: Account Avatar should be replaced with Avatar with Badge whenever available */}
        {withAvatar ? (
          <Avatar
            style={styles.avatar}
            testID={CellComponentSelectorsIDs.BASE_AVATAR}
            size={DEFAULT_CELLBASE_AVATAR_SIZE}
            {...avatarProps}
          />
        ) : null}

        <View style={styles.cellBaseInfo}>
          <Text
            numberOfLines={1}
            variant={DEFAULT_CELLBASE_AVATAR_TITLE_TEXTVARIANT}
            testID={CellComponentSelectorsIDs.BASE_TITLE}
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
                {showSecondaryTextIcon && (
                  <Icon
                    name={IconName.ArrowDown}
                    size={IconSize.Xss}
                    style={styles.arrowStyle}
                  />
                )}
              </TouchableOpacity>
            </TouchableWithoutFeedback>
          )}
          {!!tagLabel && (
            <Tag
              testID={CellComponentSelectorsIDs.TAG_LABEL}
              label={tagLabel}
              style={
                isSelected
                  ? [styles.tagLabel, styles.selectedTag]
                  : styles.tagLabel
              }
            />
          )}
        </View>
        {children && <View style={styles.optionalAccessory}>{children}</View>}
      </View>
    </ListItemMultiSelectButton>
  );
};

export default CellSelectWithMenu;
