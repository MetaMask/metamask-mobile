import React from 'react';
import { View } from 'react-native';

import { ConfirmationRowComponentIDs } from '../../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { useIsNft } from '../../../../hooks/nft/useIsNft';
import { HeroNft } from '../../../hero-nft';
import { HeroToken } from '../../../hero-token';

const styles = {
  wrapper: {
    minHeight: 100,
  },
};

export const HeroRow = ({ amountWei }: { amountWei?: string }) => {
  const { isNft, isPending } = useIsNft();

  return (
    <View
      style={styles.wrapper}
      testID={ConfirmationRowComponentIDs.TOKEN_HERO}
    >
      {!isPending && isNft === true && <HeroNft />}
      {!isPending && isNft === false && <HeroToken amountWei={amountWei} />}
    </View>
  );
};
