/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import Pressable from '../../../../../components-temp/Pressable';
import Tag from '../../../../Tags/Tag';
import ListItemMultiSelectButton from '../../../../../components-temp/ListItemMultiSelectButton/ListItemMultiSelectButton';
import Avatar from '../../../../Avatars/Avatar';
import Text from '../../../../Texts/Text';
import {
  DEFAULT_CELLBASE_AVATAR_SECONDARYTEXT_TEXTVARIANT,
  DEFAULT_CELLBASE_AVATAR_SIZE,
  DEFAULT_CELLBASE_AVATAR_TITLE_TEXTVARIANT,
} from '../../foundation/CellBase/CellBase.constants';
import Icon, { IconName, IconSize } from '../../../../Icons/Icon';

// Internal dependencies.
import styleSheet from './CellSelectWithMenu.styles';
import { CellSelectWithMenuProps } from './CellSelectWithMenu.types';
import { CellComponentSelectorsIDs } from '../../CellComponent.testIds';

const CellSelectWithMenu = ({
  style,
  avatarProps,
  title,
  titleProps,
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
          {title === undefined || typeof title === 'string' ? (
            <Text
              numberOfLines={1}
              variant={DEFAULT_CELLBASE_AVATAR_TITLE_TEXTVARIANT}
              testID={CellComponentSelectorsIDs.BASE_TITLE}
              {...titleProps}
            >
              {title}
            </Text>
          ) : (
            title
          )}
          {!!secondaryText &&
            (props.onTextClick ? (
              <Pressable
                style={styles.containerRow}
                onPress={props.onTextClick}
              >
                <Text
                  numberOfLines={1}
                  variant={DEFAULT_CELLBASE_AVATAR_SECONDTEXT_TEXTVARIANT}
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
              </Pressable>
            ) : (
              <View style={styles.containerRow}>
                <Text
                  numberOfLines={1}
                  variant={DEFAULT_CELLBASE_AVATAR_SECONDTEXT_TEXTVARIANT}
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
              </View>
            ))}
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
