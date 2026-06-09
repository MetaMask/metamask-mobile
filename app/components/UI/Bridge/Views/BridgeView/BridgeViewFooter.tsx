import React from 'react';
import { useSelector } from 'react-redux';
import { Box } from '../../../Box/Box';
import {
  FlexDirection,
  AlignItems,
  JustifyContent,
} from '../../../Box/box.types';
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
import ApprovalTooltip from '../../components/ApprovalText';
import { MetaMetricsSwapsEventSource } from '@metamask/bridge-controller';
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
import RewardsVipBadge from '../../../Rewards/components/RewardsVipBadge/RewardsVipBadge.tsx';
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
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const { quotesLastFetched } = useSelector(selectBridgeControllerState);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const isSolanaSourced = useSelector(selectIsSolanaSourced);

  const { activeQuote, isLoading, blockaidError, needsNewQuote } =
    useBridgeQuoteDataContext();
  const { showVipBadge, infoText, infoSuffix, baseFeePercentage } =
    useFeeDisclaimer({ activeQuote });

  const isValidSourceAmount =
    sourceAmount !== undefined && sourceAmount !== '.' && sourceToken?.decimals;

  const isHardwareAddress = selectedAddress
    ? !!isHardwareAccount(selectedAddress)
    : false;

  if (isLoading && !activeQuote && !needsNewQuote) {
    return null;
  }

  if (needsNewQuote) {
    return (
      <Box style={styles.buttonContainer}>
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

  const approval =
    activeQuote?.approval && sourceAmount && sourceToken
      ? { amount: sourceAmount, symbol: sourceToken.symbol }
      : null;

  return (
    isValidSourceAmount &&
    activeQuote &&
    quotesLastFetched && (
      <Box style={styles.buttonContainer}>
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
            {showVipBadge ? <RewardsVipBadge /> : null}

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

          {approval && (
            <Box
              flexDirection={FlexDirection.Row}
              alignItems={AlignItems.center}
              justifyContent={JustifyContent.center}
              testID={BridgeViewSelectorsIDs.APPROVAL_TOOLTIP}
            >
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                testID={BridgeViewSelectorsIDs.APPROVAL_TOOLTIP}
              >
                {strings('bridge.approval_needed', approval)}
              </Text>
              <ApprovalTooltip
                amount={approval.amount}
                symbol={approval.symbol}
              />
            </Box>
          )}
        </Box>
      </Box>
    )
  );
};
