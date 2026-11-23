import React from 'react';
import { useSelector } from 'react-redux';
import { CardProviderIds } from '../../../../../core/Engine/controllers/card-controller/provider-types';
import { selectCardActiveProviderId } from '../../../../../selectors/cardController';
import RedeemWallet from '../RedeemWallet/RedeemWallet';
import CardCashback from './CardCashback';

const Cashback: React.FC = () => {
  const providerId = useSelector(selectCardActiveProviderId);
  if (providerId === CardProviderIds.Immersve) {
    return <CardCashback />;
  }
  return <RedeemWallet mode="cashback" />;
};

export default Cashback;
