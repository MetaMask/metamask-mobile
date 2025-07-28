import React from 'react';
import { View } from 'react-native';

import { ConfirmationRowComponentIDs } from '../../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { useIsNft } from '../../../../hooks/nft/useIsNft';
import { HeroNft } from '../../../hero-nft';
import { HeroToken } from '../../../hero-token';
import { useStyles } from '../../../../../../../component-library/hooks';
import styleSheet from './hero-row.styles';

const LoadingHeroRow = () => {
  const { styles } = useStyles(styleSheet, {});
  return <View style={styles.loadingWrapper} />;
};

export const HeroRow = ({ amountWei }: { amountWei?: string }) => {
  const { isNft, isPending } = useIsNft();
  const { styles } = useStyles(styleSheet, {});

  return (
    <View
      style={styles.wrapper}
      testID={ConfirmationRowComponentIDs.TOKEN_HERO}
    >
      {isPending && <LoadingHeroRow />}
      {!isPending &&
        (isNft ? <HeroNft /> : <HeroToken amountWei={amountWei} />)}
    </View>
  );
};
