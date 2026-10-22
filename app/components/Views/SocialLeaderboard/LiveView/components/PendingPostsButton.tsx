import {
  ButtonBase,
  ButtonBaseSize,
  FontFamily,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';

import { AnimatedBalanceText } from '../../../../../component-library/components-temp/AnimatedNumericText';

export interface PendingPostsButtonProps {
  onPress: () => void;
  pendingNewCount: number;
  textColor?: TextColor;
}

export const getPendingPostsLabel = (pendingNewCount: number): string =>
  pendingNewCount > 60
    ? '60+ new posts'
    : `${pendingNewCount} new post${pendingNewCount === 1 ? '' : 's'}`;

const PendingPostsButton = ({
  onPress,
  pendingNewCount,
  textColor = TextColor.TextDefault,
}: PendingPostsButtonProps) => {
  const label = getPendingPostsLabel(pendingNewCount);

  return (
    <ButtonBase
      accessibilityLabel={label}
      size={ButtonBaseSize.Sm}
      onPress={onPress}
    >
      <AnimatedBalanceText
        accessible={false}
        color={textColor}
        fontFamily={FontFamily.Default}
        isLoading={false}
        loadingValue={label}
        value={label}
        variant={TextVariant.BodySm}
      />
    </ButtonBase>
  );
};

export default PendingPostsButton;
