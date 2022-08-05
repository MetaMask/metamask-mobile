/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import AvatarAccount from '../../Avatars/AvatarAccount';
import Text, { TextVariant } from '../../Text';
import { AvatarBaseSize } from '../../Avatars/AvatarBase';
import CellContainerMultiselectItem from '../CellContainerMultiselectItem';
import CellContainerSelectItem from '../CellContainerSelectItem';
import Tag from '../../Tags/Tag';

// Internal dependencies.
import {
  CELL_ACCOUNT_SINGLE_SELECT_TEST_ID,
  CELL_ACCOUNT_MULTI_SELECT_TEST_ID,
  CELL_ACCOUNT_AVATAR_TEST_ID,
  CELL_ACCOUNT_TITLE_TEST_ID,
  CELL_ACCOUNT_SECONDARY_TEXT_TEST_ID,
  CELL_ACCOUNT_TERTIARY_TEXT_TEST_ID,
  CELL_ACCOUNT_TAG_LABEL_TEST_ID,
} from './CellAccount.constants';
import styleSheet from './CellAccount.styles';
import { CellAccountProps } from './CellAccount.types';

const CellAccount = ({
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
}: CellAccountProps) => {
  const { styles } = useStyles(styleSheet, { style });
  const ContainerComponent = isMultiSelect
    ? CellContainerMultiselectItem
    : CellContainerSelectItem;
  const containerTestID = isMultiSelect
    ? CELL_ACCOUNT_MULTI_SELECT_TEST_ID
    : CELL_ACCOUNT_SINGLE_SELECT_TEST_ID;

  return (
    <ContainerComponent
      isSelected={isSelected}
      style={styles.base}
      testID={containerTestID}
      {...props}
    >
      <View style={styles.cellAccount}>
        {/* DEV Note: Account Avatar should be replaced with Avatar with Badge whenever available */}
        <AvatarAccount
          type={accountAvatarType}
          accountAddress={accountAddress}
          size={AvatarBaseSize.Md}
          style={styles.accountAvatar}
          testID={CELL_ACCOUNT_AVATAR_TEST_ID}
        />
        <View style={styles.cellAccountInfo}>
          <Text
            numberOfLines={1}
            variant={TextVariant.sHeadingSMRegular}
            testID={CELL_ACCOUNT_TITLE_TEST_ID}
          >
            {title}
          </Text>
          {!!secondaryText && (
            <Text
              numberOfLines={1}
              variant={TextVariant.sBodyMD}
              style={styles.secondaryText}
              testID={CELL_ACCOUNT_SECONDARY_TEXT_TEST_ID}
            >
              {secondaryText}
            </Text>
          )}
          {!!tertiaryText && (
            <Text
              numberOfLines={1}
              variant={TextVariant.sBodyMD}
              style={styles.tertiaryText}
              testID={CELL_ACCOUNT_TERTIARY_TEXT_TEST_ID}
            >
              {tertiaryText}
            </Text>
          )}
          {!!tagLabel && (
            <Tag
              label={tagLabel}
              style={styles.tagLabel}
              testID={CELL_ACCOUNT_TAG_LABEL_TEST_ID}
            />
          )}
        </View>
        {children && <View style={styles.optionalAccessory}>{children}</View>}
      </View>
    </ContainerComponent>
  );
};

export default CellAccount;
