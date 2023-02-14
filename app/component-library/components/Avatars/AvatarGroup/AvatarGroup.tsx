// Third party dependencies.
import React, { useCallback } from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import { AvatarSize } from '../Avatar/Avatar.types';
import Text, { TextVariant } from '../../Texts/Text';
import AvatarToken from '../Avatar/variants/AvatarToken';

// Internal dependencies.
import styleSheet from './AvatarGroup.styles';
import { AvatarGroupProps } from './AvatarGroup.types';
import {
  STACKED_AVATARS_OVERFLOW_COUNTER_ID,
  MAX_STACKED_AVATARS,
} from './AvatarGroup.constants';

const AvatarGroup = ({ tokenList }: AvatarGroupProps) => {
  const extraSmallSize = AvatarSize.Xs;
  const sizeAsNumber = Number(extraSmallSize);
  const overflowCounter = tokenList.length - MAX_STACKED_AVATARS;
  const avatarSpacing = sizeAsNumber / 2;
  const amountOfVisibleAvatars =
    overflowCounter > 0 ? MAX_STACKED_AVATARS : tokenList.length;
  const stackWidth = avatarSpacing * (amountOfVisibleAvatars + 1);
  const shouldRenderOverflowCounter = overflowCounter > 0;

  const { styles } = useStyles(styleSheet, {
    stackWidth,
    stackHeight: Number(extraSmallSize),
  });

  const renderTokenList = useCallback(
    () =>
      tokenList
        .slice(0, MAX_STACKED_AVATARS)
        .map(({ name, imageSource }, index) => {
          const leftOffset = avatarSpacing * index;

          return (
            <View
              key={`${name}-${index}`}
              style={[styles.stackedAvatarWrapper, { left: leftOffset }]}
            >
              <AvatarToken
                name={name}
                imageSource={imageSource}
                size={extraSmallSize}
              />
            </View>
          );
        }),
    [tokenList, avatarSpacing, extraSmallSize, styles.stackedAvatarWrapper],
  );

  return (
    <View style={styles.base}>
      <View style={styles.stack}>{renderTokenList()}</View>
      <View style={styles.overflowCounterWrapper}>
        {shouldRenderOverflowCounter && (
          <Text
            variant={TextVariant.BodyMD}
            style={styles.textStyle}
            testID={STACKED_AVATARS_OVERFLOW_COUNTER_ID}
          >{`+${overflowCounter}`}</Text>
        )}
      </View>
    </View>
  );
};

export default AvatarGroup;
