/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';
import { Platform, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import Text, { TextVariant } from '../../../../Texts/Text';
import AvatarSize from '../../../../Avatars/Avatar/Avatar';
import Tag from '../../../../Tags/Tag';
import Avatar from '../../../../Avatars/Avatar';

// Internal dependencies.
import {
  CELL_AVATAR_TEST_ID,
  CELL_TITLE_TEST_ID,
  CELL_SECONDARY_TEXT_TEST_ID,
  CELL_TERTIARY_TEXT_TEST_ID,
  CELL_TAG_LABEL_TEST_ID,
} from './CellBase.constants';
import styleSheet from './CellBase.styles';
import { CellBaseProps } from './CellBase.types';
import generateTestId from '../../../../../../../wdio/utils/generateTestId';

const CellBase = ({
  style,
  avatarProps,
  title,
  secondaryText,
  tertiaryText,
  tagLabel,
  children,
}: CellBaseProps) => {
  const { styles } = useStyles(styleSheet, { style });

  return (
    <View style={styles.cellBase}>
      {/* DEV Note: Account Avatar should be replaced with Avatar with Badge whenever available */}
      <Avatar
        style={styles.avatar}
        testID={CELL_AVATAR_TEST_ID}
        {...avatarProps}
        size={AvatarSize.Md}
      />
      <View style={styles.cellBaseInfo}>
        <Text
          numberOfLines={1}
          variant={TextVariant.HeadingSMRegular}
          testID={CELL_TITLE_TEST_ID}
          {...generateTestId(Platform, CELL_TITLE_TEST_ID)}
        >
          {title}
        </Text>
        {!!secondaryText && (
          <Text
            numberOfLines={1}
            variant={TextVariant.BodyMD}
            style={styles.secondaryText}
            testID={CELL_SECONDARY_TEXT_TEST_ID}
          >
            {secondaryText}
          </Text>
        )}
        {!!tertiaryText && (
          <Text
            numberOfLines={1}
            variant={TextVariant.BodyMD}
            style={styles.tertiaryText}
            testID={CELL_TERTIARY_TEXT_TEST_ID}
          >
            {tertiaryText}
          </Text>
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
  );
};

export default CellBase;
