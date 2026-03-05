import React from 'react';
import { View } from 'react-native';

import { ConfirmationRowComponentIDs } from '../../../../ConfirmationView.testIds';
import { useIsNft } from '../../../../hooks/nft/useIsNft';
import { HeroNft } from '../../../hero-nft';
import { HeroToken } from '../../../hero-token';
import { useStyles } from '../../../../../../../component-library/hooks';
import { Skeleton } from '../../../../../../../component-library/components/Skeleton';
import styleSheet from './hero-row.styles';

export function HeroRowSkeleton({
  layout,
}: {
  layout?: 'default' | 'horizontal';
}) {
  const { styles } = useStyles(styleSheet, { layout });

  if (layout === 'horizontal') {
    return (
      <View style={styles.skeletonHorizontalContainer}>
        <View style={styles.skeletonTextContainer}>
          <Skeleton
            width={60}
            height={14}
            style={styles.skeletonHorizontalBar}
          />
          <Skeleton
            width={150}
            height={24}
            style={styles.skeletonHorizontalBarMedium}
          />
          <Skeleton
            width={80}
            height={14}
            style={styles.skeletonHorizontalBar}
          />
        </View>
        <Skeleton
          width={40}
          height={40}
          style={styles.skeletonHorizontalIcon}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Skeleton
        width={48}
        height={48}
        style={styles.skeletonBorderRadiusLarge}
      />
      <Skeleton
        width={150}
        height={24}
        style={styles.skeletonBorderRadiusMedium}
      />
      <Skeleton
        width={80}
        height={18}
        style={styles.skeletonBorderRadiusSmall}
      />
    </View>
  );
}

interface HeroRowProps {
  amountWei?: string;
  layout?: 'default' | 'horizontal';
}

export const HeroRow = ({ amountWei, layout }: HeroRowProps) => {
  const { isNft, isPending } = useIsNft();
  const { styles } = useStyles(styleSheet, { layout });

  return (
    <View
      style={styles.wrapper}
      testID={ConfirmationRowComponentIDs.TOKEN_HERO}
    >
      {isPending && <HeroRowSkeleton layout={layout} />}
      {!isPending &&
        (isNft ? (
          <HeroNft />
        ) : (
          <HeroToken amountWei={amountWei} layout={layout} />
        ))}
    </View>
  );
};
