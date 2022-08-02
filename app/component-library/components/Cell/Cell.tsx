/* eslint-disable react/prop-types */
// 3rd library dependencies
import React from 'react';
import { View } from 'react-native';

// External dependencies
import { useStyles } from '../../hooks';
import AccountAvatar from '../AccountAvatar';
import BaseText, { BaseTextVariant } from '../BaseText';
import { BaseAvatarSize } from '../BaseAvatar';
import CellContainerMultiSelectItem from '../CellContainerMultiSelectItem';
import CellContainerSelectItem from '../CellContainerSelectItem';
import Tag from '../Tag';

// Internal dependencies
import {
  CELL_SINGLE_SELECT_TEST_ID,
  CELL_MULTI_SELECT_TEST_ID,
  CELL_AVATAR_TEST_ID,
  CELL_TITLE_TEST_ID,
  CELL_SECONDARY_TEXT_TEST_ID,
  CELL_TERTIARY_TEXT_TEST_ID,
  CELL_TAG_LABEL_TEST_ID,
} from './Cell.constants';
import styleSheet from './Cell.styles';
import { CellProps } from './Cell.types';

const Cell = ({
  style,
  accountAddress,
  accountAvatarType,
  title,
  secondaryText,
  tertiaryText,
  tagLabel,
  isMultiSelect = false,
  isSelected = false,
  children,
  ...props
}: CellProps) => {
  const { styles } = useStyles(styleSheet, { style });
  const ContainerComponent = isMultiSelect
    ? CellContainerMultiSelectItem
    : CellContainerSelectItem;
  const containerTestID = isMultiSelect
    ? CELL_MULTI_SELECT_TEST_ID
    : CELL_SINGLE_SELECT_TEST_ID;

  return (
    <ContainerComponent
      isSelected={isSelected}
      style={styles.base}
      testID={containerTestID}
      {...props}
    >
      <View style={styles.cell}>
        {/* DEV Note: Account Avatar should be replaced with Avatar with Badge whenever available */}
        <AccountAvatar
          type={accountAvatarType}
          accountAddress={accountAddress}
          size={BaseAvatarSize.Md}
          style={styles.accountAvatar}
          testID={CELL_AVATAR_TEST_ID}
        />
        <View style={styles.cellInfo}>
          <BaseText
            numberOfLines={1}
            variant={BaseTextVariant.sHeadingSMRegular}
            testID={CELL_TITLE_TEST_ID}
          >
            {title}
          </BaseText>
          {!!secondaryText && (
            <BaseText
              numberOfLines={1}
              variant={BaseTextVariant.sBodyMD}
              style={styles.secondaryText}
              testID={CELL_SECONDARY_TEXT_TEST_ID}
            >
              {secondaryText}
            </BaseText>
          )}
          {!!tertiaryText && (
            <BaseText
              numberOfLines={1}
              variant={BaseTextVariant.sBodyMD}
              style={styles.tertiaryText}
              testID={CELL_TERTIARY_TEXT_TEST_ID}
            >
              {tertiaryText}
            </BaseText>
          )}
          {!!tagLabel && (
            <Tag
              label={tagLabel}
              style={styles.tagLabel}
              testID={CELL_TAG_LABEL_TEST_ID}
            />
          )}
        </View>
        {children && <View style={styles.optionalAccessory}>{children}</View>}
      </View>
    </ContainerComponent>
  );
};

export default Cell;
