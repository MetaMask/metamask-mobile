import React, { useMemo } from 'react';
import { View } from 'react-native';

import { STACKED_AVATARS_OVERFLOW_COUNTER } from '../../../constants/test-ids';
import { useStyles } from '../../hooks';
import { BaseAvatarSize } from '../BaseAvatar';
import BaseText, { BaseTextVariant } from '../BaseText';
import TokenAvatar from '../TokenAvatar';

import styleSheet from './StackedAvatars.styles';
import { StackedAvatarsProps } from './StackedAvatars.types';

const MAX_STACKED_AVATARS = 4;

const StackedAvatars = ({ tokenList }: StackedAvatarsProps) => {
  const extraSmallSize = BaseAvatarSize.Xs;
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
              <TokenAvatar
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
            testID={STACKED_AVATARS_OVERFLOW_COUNTER}
          >{`+${overflowCounter}`}</BaseText>
        )}
      </View>
    </View>
  );
};

export default StackedAvatars;
