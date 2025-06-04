import React from 'react';
import { useIsNft } from '../../../hooks/nft/useIsNft';
import { HeroNft } from '../../hero-nft';
import TokenHero from '../../rows/transactions/token-hero';

export const HeroTransfer = () => {
  const { isNft } = useIsNft();

  return <>{isNft ? <HeroNft /> : <TokenHero />}</>;
};
