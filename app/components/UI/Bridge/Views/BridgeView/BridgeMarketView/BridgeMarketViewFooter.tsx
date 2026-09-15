import React from 'react';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '../../../../Box/Box';
import { FlexDirection, AlignItems } from '../../../../Box/box.types';
import { useLatestBalance } from '../../../hooks/useLatestBalance';
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
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds.ts';
import type { TransactionActiveAbTestEntry } from '../../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import RewardsVipBadge from '../../../../Rewards/components/RewardsVipBadge';
import { RewardsDiscountBadge } from '../../../../Rewards/components/RewardsDiscountBadge';
import { useFeeDisclaimer } from '../../../hooks/useFeeDisclaimer';

interface Props {
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
  location: MetaMetricsSwapsEventSource;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

export const BridgeMarketViewFooter = ({
  latestSourceBalance,
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
          latestSourceBalance={latestSourceBalance}
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
          latestSourceBalance={latestSourceBalance}
          transactionActiveAbTests={transactionActiveAbTests}
        />
        <Box flexDirection={FlexDirection.Column} gap={2}>
          <Box
            flexDirection={FlexDirection.Row}
            alignItems={AlignItems.center}
            gap={2}
            testID={BridgeViewSelectorsIDs.FEE_DISCLAIMER}
          >
            {discountBadge?.type === DiscountType.VIP ? (
              <RewardsVipBadge />
            ) : null}

            {discountBadge && discountBadge.type !== DiscountType.VIP ? (
              <RewardsDiscountBadge label={discountBadge.label} />
            ) : null}

            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {infoText}
            </Text>

            {baseFeePercentage && (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                // eslint-disable-next-line react-native/no-inline-styles
                style={{ textDecorationLine: 'line-through' }}
              >
                {baseFeePercentage}
              </Text>
            )}

            {infoSuffix && (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {infoSuffix}
              </Text>
            )}
          </Box>
        </Box>
      </Box>
    )
  );
};
