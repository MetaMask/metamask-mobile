import React from 'react';
import { useSelector } from 'react-redux';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { selectCardActiveProviderId } from '../../../../../selectors/cardController';
import RedeemWallet, { RedeemWalletView } from '../RedeemWallet/RedeemWallet';
import useImmersveCashbackWallet from './useImmersveCashbackWallet';

/** Immersve mUSD back: Rewards Money's card summary on the same screen. */
const ImmersveCashback: React.FC = () => {
  const source = useImmersveCashbackWallet();
  return <RedeemWalletView mode="cashback" source={source} />;
};

/**
 * One mUSD back screen for every provider. Baanx reads its reward wallet;
 * Immersve reads Rewards Money's card summary and claims through Rewards.
 */
const Cashback: React.FC = () => {
  const providerId = useSelector(selectCardActiveProviderId);
  if (providerId === CardProviderIds.Immersve) {
    return <ImmersveCashback />;
  }
  return <RedeemWallet mode="cashback" />;
};

export default Cashback;
