// Third party dependencies.
import React, { useMemo } from 'react';
import { View } from 'react-native';

// External dependencies.
import { useStyles } from '../../../hooks';
import { AvatarBaseSize } from '../AvatarBase';
import Text, { TextVariant } from '../../Text';
import AvatarToken from '../AvatarToken';

// Internal dependencies.
import styleSheet from './AvatarGroup.styles';
import { AvatarGroupProps } from './AvatarGroup.types';
import {
  STACKED_AVATARS_OVERFLOW_COUNTER_ID,
  MAX_STACKED_AVATARS,
} from './AvatarGroup.constants';

const AvatarGroup = ({ tokenList }: AvatarGroupProps) => {
  const extraSmallSize = AvatarBaseSize.Xs;
  const sizeAsNumber = Number(extraSmallSize);
  const overflowCounter = tokenList.length - MAX_STACKED_AVATARS;
  const avatarSpacing = sizeAsNumber / 2;
  const amountOfVisibleAvatars =
    overflowCounter > 0 ? MAX_STACKED_AVATARS : tokenList.length;
  const stackWidth = avatarSpacing * (amountOfVisibleAvatars + 1);
  const shouldRenderOverflowCounter = overflowCounter > 0;

  const { styles } = useStyles(styleSheet, { stackWidth });

  const renderTokenList = useMemo(
    () =>
      tokenList
        .slice(0, MAX_STACKED_AVATARS)
        .map(({ name, imageSource, id }, index) => {
          const leftOffset = avatarSpacing * index;

          return (
            <View
              key={`${name}-${id}`}
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
      <View style={styles.stack}>{renderTokenList}</View>
      <View style={styles.overflowCounterWrapper}>
        {shouldRenderOverflowCounter && (
          <Text
            variant={TextVariant.sBodyMD}
            style={styles.textStyle}
            testID={STACKED_AVATARS_OVERFLOW_COUNTER_ID}
          >{`+${overflowCounter}`}</Text>
        )}
      </View>
    </View>
  );
};

export default AvatarGroup;
