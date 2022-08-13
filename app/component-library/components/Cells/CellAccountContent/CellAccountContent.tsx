/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import AvatarAccount from '../../Avatars/AvatarAccount';
import Text, { TextVariant } from '../../Text';
import { AvatarBaseSize } from '../../Avatars/AvatarBase';
import Tag from '../../Tags/Tag';

// Internal dependencies.
import {
  CELL_ACCOUNT_AVATAR_TEST_ID,
  CELL_ACCOUNT_TITLE_TEST_ID,
  CELL_ACCOUNT_SECONDARY_TEXT_TEST_ID,
  CELL_ACCOUNT_TERTIARY_TEXT_TEST_ID,
  CELL_ACCOUNT_TAG_LABEL_TEST_ID,
} from './CellAccountContent.constants';
import styleSheet from './CellAccountContent.styles';
import { CellAccountContentProps } from './CellAccountContent.types';

const CellAccountContent = ({
  style,
  avatarAccountAddress,
  avatarAccountType,
  title,
  secondaryText,
  tertiaryText,
  tagLabel,
  children,
}: CellAccountContentProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <View style={styles.CellAccountContent}>
      {/* DEV Note: Account Avatar should be replaced with Avatar with Badge whenever available */}
      <AvatarAccount
        type={avatarAccountType}
        accountAddress={avatarAccountAddress}
        size={AvatarBaseSize.Md}
        style={styles.avatarAccount}
        testID={CELL_ACCOUNT_AVATAR_TEST_ID}
      />
      <View style={styles.CellAccountContentInfo}>
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
  );
};

export default CellAccountContent;
