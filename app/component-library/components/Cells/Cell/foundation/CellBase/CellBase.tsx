/* eslint-disable react/prop-types */

// Third library dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../../hooks';
import Text from '../../../../Texts/Text';
import Tag from '../../../../Tags/Tag';
import Avatar from '../../../../Avatars/Avatar';

// Internal dependencies.
import {
  DEFAULT_CELLBASE_AVATAR_SIZE,
  DEFAULT_CELLBASE_AVATAR_TITLE_TEXTVARIANT,
  DEFAULT_CELLBASE_AVATAR_SECONDARYTEXT_TEXTVARIANT,
  DEFAULT_CELLBASE_AVATAR_TERTIARYTEXT_TEXTVARIANT,
} from './CellBase.constants';
import styleSheet from './CellBase.styles';
import { CellBaseProps } from './CellBase.types';
import { CellComponentSelectorsIDs } from '../../../../../../../e2e/selectors/wallet/CellComponent.selectors';

const CellBase = ({
  style,
  avatarProps,
  title,
  titleProps,
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
        testID={CellComponentSelectorsIDs.BASE_AVATAR}
        size={DEFAULT_CELLBASE_AVATAR_SIZE}
        {...avatarProps}
      />
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
        {!!secondaryText && (
          <Text
            numberOfLines={1}
            variant={DEFAULT_CELLBASE_AVATAR_SECONDARYTEXT_TEXTVARIANT}
            style={styles.secondaryText}
          >
            {secondaryText}
          </Text>
        )}
        {!!tertiaryText && (
          <Text
            numberOfLines={1}
            variant={DEFAULT_CELLBASE_AVATAR_TERTIARYTEXT_TEXTVARIANT}
            style={styles.tertiaryText}
          >
            {tertiaryText}
          </Text>
        )}
        {!!tagLabel && <Tag label={tagLabel} style={styles.tagLabel} />}
      </View>
      {children && <View style={styles.optionalAccessory}>{children}</View>}
    </View>
  );
};

export default CellBase;
