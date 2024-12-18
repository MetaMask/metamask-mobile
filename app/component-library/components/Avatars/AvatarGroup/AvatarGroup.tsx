// Third party dependencies.
import React, { useCallback } from 'react';
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
  AVATARGROUP_AVATAR_CONTAINER_TESTID,
  AVATARGROUP_AVATAR_TESTID,
  AVATARGROUP_OVERFLOWCOUNTER_TESTID,
  SPACEBETWEENAVATARS_BY_AVATARSIZE,
  TEXTVARIANT_BY_AVATARSIZE,
} from './AvatarGroup.constants';

const AvatarGroup = ({
  avatarPropsList,
  size = DEFAULT_AVATARGROUP_AVATARSIZE,
  maxStackedAvatars = DEFAULT_AVATARGROUP_MAXSTACKEDAVATARS,
  includesBorder = true,
  spaceBetweenAvatars,
  style,
}: AvatarGroupProps) => {
  const overflowCounter = avatarPropsList.length - maxStackedAvatars;
  const avatarNegativeSpacing =
    spaceBetweenAvatars || SPACEBETWEENAVATARS_BY_AVATARSIZE[size];
  const shouldRenderOverflowCounter = overflowCounter > 0;

  const { styles } = useStyles(styleSheet, {
    size,
    style,
  });

  const renderAvatarList = useCallback(
    () =>
      avatarPropsList.slice(0, maxStackedAvatars).map((avatarProps, index) => {
        const marginLeft = index === 0 ? 0 : avatarNegativeSpacing;

        return (
          <View
            key={`avatar-${index}`}
            testID={`${AVATARGROUP_AVATAR_CONTAINER_TESTID}-${index}`}
            style={{ marginLeft }}
          >
            <Avatar
              {...avatarProps}
              size={size}
              includesBorder={includesBorder}
              testID={AVATARGROUP_AVATAR_TESTID}
            />
          </View>
        );
      }),
    [
      avatarPropsList,
      avatarNegativeSpacing,
      includesBorder,
      maxStackedAvatars,
      size,
    ],
  );

  return (
    <View style={styles.base}>
      {renderAvatarList()}
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
