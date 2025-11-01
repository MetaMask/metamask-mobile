/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../hooks';
import Tag from '../../../component-library/components/Tags/Tag';

// Internal dependencies.
import styleSheet from './CellSelectWithMenu.styles';
import { CellSelectWithMenuProps } from './CellSelectWithMenu.types';
import { CellComponentSelectorsIDs } from '../../../../e2e/selectors/wallet/CellComponent.selectors';
import ListItemMultiSelectWithMenuButton from '../ListItemMultiSelectWithMenuButton/ListItemMultiSelectWithMenuButton';
import Avatar from '../../../component-library/components/Avatars/Avatar';
import Text from '../../../component-library/components/Texts/Text';
import {
  DEFAULT_CELLBASE_AVATAR_SIZE,
  DEFAULT_CELLBASE_AVATAR_TITLE_TEXTVARIANT,
} from '../../../component-library/components/Cells/Cell/foundation/CellBase/CellBase.constants';

const CellMultiSelectWithMenu = ({
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
  ...props
}: CellSelectWithMenuProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <ListItemMultiSelectWithMenuButton
      isSelected={isSelected}
      style={styles.base}
      testID={CellComponentSelectorsIDs.MULTISELECT_WITH_MENU}
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

        <View style={styles.cellMultiSelectBaseInfo}>
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
    </ListItemMultiSelectWithMenuButton>
  );
};

export default CellMultiSelectWithMenu;
