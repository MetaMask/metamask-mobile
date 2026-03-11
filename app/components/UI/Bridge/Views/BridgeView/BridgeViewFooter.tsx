import React from 'react';
import { useSelector } from 'react-redux';
import { Box } from '../../../Box/Box';
import { FlexDirection, AlignItems } from '../../../Box/box.types';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import {
  selectSourceAmount,
  selectDestToken,
  selectSourceToken,
  selectBridgeControllerState,
  selectIsSolanaSourced,
} from '../../../../../core/redux/slices/bridge';
import { strings } from '../../../../../../locales/i18n';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import BannerAlert from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { isHardwareAccount } from '../../../../../util/address';
import ApprovalTooltip from '../../components/ApprovalText';
import {
  BRIDGE_MM_FEE_RATE,
  MetaMetricsSwapsEventSource,
} from '@metamask/bridge-controller';
import { isNullOrUndefined } from '@metamask/utils';
import { SwapsConfirmButton } from '../../components/SwapsConfirmButton/index.tsx';
import { useStyles } from '../../../../../component-library/hooks/useStyles.ts';
import { createStyles } from './BridgeView.styles.ts';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';

interface Props {
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
  location: MetaMetricsSwapsEventSource;
}

export const BridgeViewFooter = ({ latestSourceBalance, location }: Props) => {
  const { styles } = useStyles(createStyles);
  const sourceAmount = useSelector(selectSourceAmount);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const { quotesLastFetched } = useSelector(selectBridgeControllerState);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const isSolanaSourced = useSelector(selectIsSolanaSourced);

  const { activeQuote, isLoading, blockaidError, needsNewQuote } =
    useBridgeQuoteData({
      latestSourceAtomicBalance: latestSourceBalance?.atomicBalance,
    });

  const isValidSourceAmount =
    sourceAmount !== undefined && sourceAmount !== '.' && sourceToken?.decimals;

  const isHardwareAddress = selectedAddress
    ? !!isHardwareAccount(selectedAddress)
    : false;

  if (isLoading && !activeQuote && !needsNewQuote) {
    return null;
  }

  // Prevent bottom section from rendering when no active
  // quotes exist and none are being fetching.
  // This resolves edge cases when users are redirected back from
  // Select Quote page due to quotes expiry.
  if (!activeQuote && !needsNewQuote) {
    return null;
  }

  if (needsNewQuote) {
    return (
      <Box style={styles.buttonContainer}>
        <SwapsConfirmButton
          location={location}
          latestSourceBalance={latestSourceBalance}
        />
      </Box>
    );
  }

  // TODO: remove this once controller types are updated
  // @ts-expect-error: controller types are not up to date yet
  const quoteBpsFee = activeQuote?.quote?.feeData?.metabridge?.quoteBpsFee;
  const feePercentage = !isNullOrUndefined(quoteBpsFee)
    ? quoteBpsFee / 100
    : BRIDGE_MM_FEE_RATE;

  const hasFee = activeQuote && feePercentage > 0;

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
        />
        <Box flexDirection={FlexDirection.Row} alignItems={AlignItems.center}>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {hasFee
              ? strings('bridge.fee_disclaimer', {
                  feePercentage,
                })
              : strings('bridge.no_mm_fee_disclaimer', {
                  destTokenSymbol: destToken?.symbol,
                })}
            {approval
              ? ` ${strings('bridge.approval_needed', approval)}`
              : ''}{' '}
          </Text>
          {approval && (
            <ApprovalTooltip
              amount={approval.amount}
              symbol={approval.symbol}
            />
          )}
        </Box>
      </Box>
    )
  );
};
