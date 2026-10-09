import React from 'react';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  selectSourceAmount,
  selectSourceToken,
  selectBridgeControllerState,
} from '../../../../../../core/redux/slices/bridge';
import { useBridgeQuoteDataContext } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import {
  BlockaidErrorBanner,
  HardwareWalletSolanaSignUnsupportedBanner,
} from '../../../components/SwapsBanners';
import {
  DiscountType,
  MetaMetricsSwapsEventSource,
} from '@metamask/bridge-controller';
import { SwapsMarketOrderConfirmButton } from '../../../components/SwapsMarketOrderConfirmButton/index.tsx';
import { useStyles } from '../../../../../../component-library/hooks/useStyles.ts';
import { createStyles } from './BridgeMarketView.styles.ts';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxFlexWrap,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds.ts';
import type { TransactionActiveAbTestEntry } from '../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import MembershipVipBadge from '../../../../Rewards/components/MembershipVipBadge';
import { RewardsDiscountBadge } from '../../../../Rewards/components/RewardsDiscountBadge';
import { useFeeDisclaimer } from '../../../hooks/useFeeDisclaimer';

interface Props {
  location: MetaMetricsSwapsEventSource;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

export const BridgeMarketViewFooter = ({
  location,
  transactionActiveAbTests,
}: Props) => {
  const { styles } = useStyles(createStyles);
  const { bottom: bottomInset } = useSafeAreaInsets();
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const { quotesLastFetched } = useSelector(selectBridgeControllerState);

  const { activeQuote, isLoading, needsNewQuote } = useBridgeQuoteDataContext();
  const { discountBadge, infoText, infoSuffix, baseFeePercentage } =
    useFeeDisclaimer({ activeQuote });

  const isRewardsTierBadge =
    discountBadge?.type === DiscountType.VIP ||
    discountBadge?.type === DiscountType.SUBSCRIPTION;

  const isValidSourceAmount =
    sourceAmount !== undefined && sourceAmount !== '.' && sourceToken?.decimals;

  const footerContainerStyle = [
    styles.buttonContainer,
    { paddingBottom: bottomInset },
  ];

  if (needsNewQuote || (isLoading && !activeQuote)) {
    return (
      <Box style={footerContainerStyle}>
        <SwapsMarketOrderConfirmButton
          location={location}
          transactionActiveAbTests={transactionActiveAbTests}
        />
      </Box>
    );
  }

  if (!activeQuote) {
    return null;
  }

  return (
    isValidSourceAmount &&
    activeQuote &&
    quotesLastFetched && (
      <Box style={footerContainerStyle}>
        <HardwareWalletSolanaSignUnsupportedBanner />
        <BlockaidErrorBanner />
        <SwapsMarketOrderConfirmButton
          location={location}
          transactionActiveAbTests={transactionActiveAbTests}
        />
        <Box flexDirection={BoxFlexDirection.Column} gap={2}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            flexWrap={BoxFlexWrap.Wrap}
            gap={2}
            testID={BridgeViewSelectorsIDs.FEE_DISCLAIMER}
          >
            {discountBadge ? (
              isRewardsTierBadge ? (
                <MembershipVipBadge
                  hasProEntitlement={
                    discountBadge.type === DiscountType.SUBSCRIPTION
                  }
                />
              ) : (
                <RewardsDiscountBadge label={discountBadge.label} />
              )
            ) : null}

            <Box flexDirection={BoxFlexDirection.Row} gap={1}>
              {infoText ? (
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.TextAlternative}
                >
                  {infoText}
                </Text>
              ) : null}

              {baseFeePercentage && (
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.TextAlternative}
                  twClassName="line-through"
                >
                  {baseFeePercentage}
                </Text>
              )}

              {infoSuffix && (
                <Text
                  variant={TextVariant.BodyXs}
                  color={TextColor.TextAlternative}
                >
                  {infoSuffix}
                </Text>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    )
  );
};
