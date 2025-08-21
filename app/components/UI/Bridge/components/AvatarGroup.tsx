// Third party dependencies.
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../../component-library/hooks';
import Avatar, {
  AvatarSize,
} from '../../../../component-library/components/Avatars/Avatar';
import Text, {
  TextColor,
} from '../../../../component-library/components/Texts/Text';

// Internal dependencies.
import styleSheet from '../../../../component-library/components/Avatars/AvatarGroup/AvatarGroup.styles';
import { AvatarGroupProps } from '../../../../component-library/components/Avatars/AvatarGroup/AvatarGroup.types';
import {
  DEFAULT_AVATARGROUP_AVATARSIZE,
  DEFAULT_AVATARGROUP_MAXSTACKEDAVATARS,
  AVATARGROUP_AVATAR_CONTAINER_TESTID,
  AVATARGROUP_AVATAR_TESTID,
  AVATARGROUP_OVERFLOWCOUNTER_TESTID,
  SPACEBETWEENAVATARS_BY_AVATARSIZE,
  TEXTVARIANT_BY_AVATARSIZE,
  AVATARGROUP_CONTAINER_TESTID,
} from '../../../../component-library/components/Avatars/AvatarGroup/AvatarGroup.constants';
import { Theme } from '../../../../util/theme/models';

const createCustomStyles = (params: { theme: Theme }) => {
  const { theme } = params;
  return StyleSheet.create({
    overflowCounter: {
      backgroundColor: theme.colors.overlay.alternative,
      marginLeft: -16,
      fontSize: 10,
      width: Number(AvatarSize.Xs),
      height: Number(AvatarSize.Xs),
      borderRadius: 4,
      textAlign: 'center',
      textAlignVertical: 'center',
      lineHeight: Number(AvatarSize.Xs),
    },
  });
};

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

  const { styles: customStyles } = useStyles(createCustomStyles, {});

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
    <View testID={AVATARGROUP_CONTAINER_TESTID} style={styles.base}>
      {renderAvatarList()}
      {shouldRenderOverflowCounter && (
        <Text
          variant={TEXTVARIANT_BY_AVATARSIZE[size]}
          color={TextColor.Inverse}
          style={customStyles.overflowCounter}
          testID={AVATARGROUP_OVERFLOWCOUNTER_TESTID}
        >{`+${overflowCounter}`}</Text>
      )}
    </View>
  );
};

export default AvatarGroup;
