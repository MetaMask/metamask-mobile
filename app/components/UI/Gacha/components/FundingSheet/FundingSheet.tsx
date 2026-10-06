import React from 'react';
import { QuickBuy } from '../../../QuickBuy/quickBuy';
import { TOP_TRADERS_QUICK_BUY_FEATURES } from '../../../QuickBuy/features';
import type {
  QuickBuyAnalyticsContext,
  QuickBuyFeatures,
  QuickBuyFundingOptions,
  QuickBuyTarget,
} from '../../../QuickBuy/types';
import {
  COLLECTOR_CRYPT_SCOPE,
  SOLANA_USDC_MINT,
} from '../../providers/collector-crypt/constants';

const TARGET: QuickBuyTarget = {
  chain: COLLECTOR_CRYPT_SCOPE,
  tokenAddress: SOLANA_USDC_MINT,
  tokenSymbol: 'USDC',
  tokenName: 'USD Coin',
};
const FEATURES: QuickBuyFeatures = {
  ...TOP_TRADERS_QUICK_BUY_FEATURES,
  tradeModes: ['buy'],
};
/** Attributes funding trades to Gacha in the shared Quick Buy events. */
const ANALYTICS_CONTEXT: QuickBuyAnalyticsContext = { source: 'gacha' };

/** Shared USDC funding destination for onboarding and pack purchases. */
const FundingSheet = ({
  options,
  onClose,
}: {
  options: QuickBuyFundingOptions;
  onClose: () => void;
}) => (
  <QuickBuy.Root
    isVisible
    target={TARGET}
    features={FEATURES}
    analyticsContext={ANALYTICS_CONTEXT}
    onClose={onClose}
    {...options}
  />
);

export default FundingSheet;
