import React from 'react';
import { useIsNft } from '../../../../hooks/nft/useIsNft';
import { HeroNft } from '../../../hero-nft';
import { HeroToken } from '../../../hero-token';

export const HeroRow = ({ amountWei }: { amountWei?: string }) => {
  const { isNft } = useIsNft();

  return <>{isNft ? <HeroNft /> : <HeroToken amountWei={amountWei} />}</>;
};
