import React from 'react';
import { View } from 'react-native';

import { ConfirmationRowComponentIDs } from '../../../../../../../../e2e/selectors/Confirmation/ConfirmationView.selectors';
import { useIsNft } from '../../../../hooks/nft/useIsNft';
import { HeroNft } from '../../../hero-nft';
import { HeroToken } from '../../../hero-token';

export const HeroRow = ({ amountWei }: { amountWei?: string }) => {
  const { isNft } = useIsNft();

  return (
    <View testID={ConfirmationRowComponentIDs.TOKEN_HERO}>
      {isNft ? <HeroNft /> : <HeroToken amountWei={amountWei} />}
    </View>
  );
};
