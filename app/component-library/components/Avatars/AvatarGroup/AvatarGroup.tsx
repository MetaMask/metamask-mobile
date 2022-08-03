import React, { useMemo } from 'react';
import { View } from 'react-native';

import { useStyles } from '../../../hooks';
import { AvatarBaseSize } from '../AvatarBase';
import BaseText, { BaseTextVariant } from '../../BaseText';
import AvatarToken from '../AvatarToken';

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
        .map(({ name, imageUrl, id }, index) => {
          const leftOffset = avatarSpacing * index;

          return (
            <View
              key={`${name}-${id}`}
              style={[styles.stackedAvatarWrapper, { left: leftOffset }]}
            >
              <AvatarToken
                tokenName={name}
                tokenImageUrl={imageUrl}
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
          <BaseText
            variant={BaseTextVariant.sBodyMD}
            style={styles.textStyle}
            testID={STACKED_AVATARS_OVERFLOW_COUNTER_ID}
          >{`+${overflowCounter}`}</BaseText>
        )}
      </View>
    </View>
  );
};

export default AvatarGroup;
