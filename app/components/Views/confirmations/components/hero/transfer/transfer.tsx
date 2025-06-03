import React from 'react';
import TokenHero from '../../rows/transactions/token-hero';
import { HeroNft } from '../nft/nft';
import { useIsNft } from '../../../hooks/nft/useIsNft';

export const HeroTransfer = () => {
  const { isNft } = useIsNft();

  return <>{isNft ? <HeroNft /> : <TokenHero />}</>;
};
