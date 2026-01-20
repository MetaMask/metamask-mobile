import React from 'react';
import { View } from 'react-native';

import { ConfirmationRowComponentIDs } from '../../../../ConfirmationView.testIds';
import { useIsNft } from '../../../../hooks/nft/useIsNft';
import { HeroNft } from '../../../hero-nft';
import { HeroToken } from '../../../hero-token';
import { useStyles } from '../../../../../../../component-library/hooks';
import { Skeleton } from '../../../../../../../component-library/components/Skeleton';
import styleSheet from './hero-row.styles';

export function HeroRowSkeleton() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <View style={styles.wrapper}>
      <Skeleton
        width={64}
        height={64}
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

export const HeroRow = ({ amountWei }: { amountWei?: string }) => {
  const { isNft, isPending } = useIsNft();
  const { styles } = useStyles(styleSheet, {});

  return (
    <View
      style={styles.wrapper}
      testID={ConfirmationRowComponentIDs.TOKEN_HERO}
    >
      {isPending && <HeroRowSkeleton />}
      {!isPending &&
        (isNft ? <HeroNft /> : <HeroToken amountWei={amountWei} />)}
    </View>
  );
};
