import React from 'react';
import { useWindowDimensions } from 'react-native';
import { typography } from '@metamask/design-tokens';
import { Box, Skeleton } from '@metamask/design-system-react-native';
import {
  COMPACT_PACK_ACTION_HEIGHT,
  getCompactPurchaseCopyHeight,
  PACK_TILE_ARTWORK_ASPECT_RATIO,
} from './PackCard.layout';

/** Loading uses the artwork and text slots of a real tile, including its action. */
const PackCardSkeleton = ({
  variant = 'compact',
  withPurchase = false,
  withSocialContext = false,
  testID,
}: {
  variant?: 'compact' | 'carousel';
  withPurchase?: boolean;
  withSocialContext?: boolean;
  testID?: string;
}): React.JSX.Element => {
  const { fontScale } = useWindowDimensions();
  return (
    <Box
      twClassName="w-full"
      testID={testID}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Box
        padding={variant === 'carousel' ? 3 : 2}
        twClassName="rounded-xl border border-muted overflow-hidden bg-muted"
      >
        <Box style={{ aspectRatio: PACK_TILE_ARTWORK_ASPECT_RATIO }}>
          <Skeleton width="100%" height="100%" />
        </Box>
      </Box>
      <Box
        twClassName="pt-2"
        gap={1}
        style={
          withPurchase
            ? { minHeight: getCompactPurchaseCopyHeight(fontScale) }
            : undefined
        }
      >
        {!withPurchase && (
          <Skeleton
            height={typography.sBodyXS.lineHeight * fontScale}
            width="55%"
          />
        )}
        <Skeleton
          height={typography.sBodySM.lineHeight * fontScale}
          width="85%"
        />
        {withSocialContext && (
          <Skeleton
            height={Math.max(24, typography.sBodyXS.lineHeight * fontScale)}
            width="75%"
          />
        )}
        <Box marginTop={2} twClassName="mb-1.5">
          <Skeleton
            height={
              withPurchase
                ? COMPACT_PACK_ACTION_HEIGHT
                : typography.sBodySM.lineHeight * fontScale
            }
            width={withPurchase ? '70%' : '40%'}
            twClassName={withPurchase ? 'rounded-full' : undefined}
          />
        </Box>
      </Box>
    </Box>
  );
};

export default PackCardSkeleton;
