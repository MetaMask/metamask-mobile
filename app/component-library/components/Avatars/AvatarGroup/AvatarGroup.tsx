// Third party dependencies.
import React from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import Avatar from '../Avatar';
import Text from '../../Texts/Text';

// Internal dependencies.
import styleSheet from './AvatarGroup.styles';
import { AvatarGroupProps } from './AvatarGroup.types';
import {
  DEFAULT_AVATARGROUP_AVATARSIZE,
  DEFAULT_AVATARGROUP_MAXSTACKEDAVATARS,
  DEFAULT_AVATARGROUP_COUNTER_TEXTCOLOR,
  AVATARGROUP_AVATAR_TESTID,
  AVATARGROUP_OVERFLOWCOUNTER_TESTID,
  TEXTVARIANT_BY_AVATARSIZE,
} from './AvatarGroup.constants';

const AvatarGroup = ({
  avatarPropsList,
  size = DEFAULT_AVATARGROUP_AVATARSIZE,
  maxStackedAvatars = DEFAULT_AVATARGROUP_MAXSTACKEDAVATARS,
  style,
}: AvatarGroupProps) => {
  const sizeAsNumber = Number(size);
  const overflowCounter = avatarPropsList.length - maxStackedAvatars;
  const avatarNegativeSpacing = sizeAsNumber / 2;
  const shouldRenderOverflowCounter = overflowCounter > 0;

  const { styles } = useStyles(styleSheet, {
    size,
    style,
  });

  const renderavatarPropsList = () =>
    avatarPropsList.slice(0, maxStackedAvatars).map((avatarProps, index) => {
      const marginLeft = index === 0 ? 0 : -avatarNegativeSpacing;

      return (
        <View key={`avatar-${index}`} style={{ marginLeft }}>
          <Avatar
            style={styles.avatar}
            {...avatarProps}
            size={size}
            testID={AVATARGROUP_AVATAR_TESTID}
          />
        </View>
      );
    });

  return (
    <View style={styles.base}>
      {renderavatarPropsList()}
      {shouldRenderOverflowCounter && (
        <Text
          variant={TEXTVARIANT_BY_AVATARSIZE[size]}
          color={DEFAULT_AVATARGROUP_COUNTER_TEXTCOLOR}
          style={styles.textStyle}
          testID={AVATARGROUP_OVERFLOWCOUNTER_TESTID}
        >{`+${overflowCounter}`}</Text>
      )}
    </View>
  );
};

export default AvatarGroup;
