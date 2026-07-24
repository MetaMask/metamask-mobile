import React from 'react';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Box } from '../../../Box/Box';
import { FlexDirection, AlignItems } from '../../../Box/box.types';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import {
  selectSourceAmount,
  selectSourceToken,
  selectBridgeControllerState,
  selectIsSolanaSourced,
} from '../../../../../core/redux/slices/bridge';
import { strings } from '../../../../../../locales/i18n';
import { useBridgeQuoteDataContext } from '../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { isHardwareAccount } from '../../../../../util/address';
import {
  DiscountType,
  MetaMetricsSwapsEventSource,
} from '@metamask/bridge-controller';
import { SwapsConfirmButton } from '../../components/SwapsConfirmButton/index.tsx';
import { useStyles } from '../../../../../component-library/hooks/useStyles.ts';
import { createStyles } from './BridgeView.styles.ts';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { BridgeViewSelectorsIDs } from './BridgeView.testIds.ts';
import type { TransactionActiveAbTestEntry } from '../../../../../util/transactions/transaction-active-ab-test-attribution-registry';
import RewardsVipBadge from '../../../Rewards/components/RewardsVipBadge';
import { RewardsDiscountBadge } from '../../../Rewards/components/RewardsDiscountBadge';
import { useFeeDisclaimer } from '../../hooks/useFeeDisclaimer';

interface Props {
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
  location: MetaMetricsSwapsEventSource;
  transactionActiveAbTests?: TransactionActiveAbTestEntry[];
}

export const BridgeViewFooter = ({
  latestSourceBalance,
  location,
  transactionActiveAbTests,
}: Props) => {
  const { styles } = useStyles(createStyles);
  const { bottom: bottomInset } = useSafeAreaInsets();
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const { quotesLastFetched } = useSelector(selectBridgeControllerState);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const isSolanaSourced = useSelector(selectIsSolanaSourced);

  const { activeQuote, isLoading, blockaidError, needsNewQuote } =
    useBridgeQuoteDataContext();
  const { discountBadge, infoText, infoSuffix, baseFeePercentage } =
    useFeeDisclaimer({ activeQuote });

  const isValidSourceAmount =
    sourceAmount !== undefined && sourceAmount !== '.' && sourceToken?.decimals;

  const isHardwareAddress = selectedAddress
    ? !!isHardwareAccount(selectedAddress)
    : false;

  if (isLoading && !activeQuote && !needsNewQuote) {
    return null;
  }

  const footerContainerStyle = [
    styles.buttonContainer,
    { paddingBottom: bottomInset },
  ];

  if (needsNewQuote) {
    return (
      <Box style={footerContainerStyle}>
        <SwapsConfirmButton
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
        {isHardwareAddress && isSolanaSourced && (
          <BannerAlert
            severity={BannerAlertSeverity.Error}
            description={strings('bridge.hardware_wallet_not_supported_solana')}
          />
        )}
        {blockaidError && (
          <BannerAlert
            severity={BannerAlertSeverity.Error}
            title={strings('bridge.blockaid_error_title')}
            description={blockaidError}
          />
        )}
        <SwapsConfirmButton
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
