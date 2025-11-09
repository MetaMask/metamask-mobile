import React, {
  ReactNode,
  memo,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { PayTokenAmount, PayTokenAmountSkeleton } from '../../pay-token-amount';
import InfoSection from '../../UI/info-row/info-section';
import { PayWithRow, PayWithRowSkeleton } from '../../rows/pay-with-row';
import { BridgeFeeRow } from '../../rows/bridge-fee-row';
import { BridgeTimeRow } from '../../rows/bridge-time-row';
import { TotalRow } from '../../rows/total-row';
import {
  DepositKeyboard,
  DepositKeyboardSkeleton,
} from '../../deposit-keyboard';
import { Box } from '../../../../../UI/Box/Box';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './custom-amount-info.styles';
import { useTransactionCustomAmount } from '../../../hooks/transactions/useTransactionCustomAmount';
import { useTransactionCustomAmountAlerts } from '../../../hooks/transactions/useTransactionCustomAmountAlerts';
import AlertBanner from '../../alert-banner';
import useClearConfirmationOnBackSwipe from '../../../hooks/ui/useClearConfirmationOnBackSwipe';
import { useAutomaticTransactionPayToken } from '../../../hooks/pay/useAutomaticTransactionPayToken';
import { useConfirmationContext } from '../../../context/confirmation-context';
import { AlertMessage } from '../../alerts/alert-message';
import {
  CustomAmount,
  CustomAmountSkeleton,
} from '../../transactions/custom-amount';
import {
  useIsTransactionPayLoading,
  useTransactionPayQuotes,
  useTransactionPayRequiredTokens,
  useTransactionPaySourceAmounts,
} from '../../../hooks/pay/useTransactionPayData';
import { useTransactionPayMetrics } from '../../../hooks/pay/useTransactionPayMetrics';
import { useTransactionPayAvailableTokens } from '../../../hooks/pay/useTransactionPayAvailableTokens';
import Button, {
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import {
  RampMode,
  useRampNavigation,
} from '../../../../../UI/Ramp/hooks/useRampNavigation';
import { RampType } from '../../../../../../reducers/fiatOrders/types';
import { useAccountTokens } from '../../../hooks/send/useAccountTokens';
import { getNativeTokenAddress } from '../../../utils/asset';
import { toCaipAssetType } from '@metamask/utils';
import { AlignItems } from '../../../../../UI/Box/box.types';
import { strings } from '../../../../../../../locales/i18n';

export interface CustomAmountInfoProps {
  children?: ReactNode;
  currency?: string;
  disablePay?: boolean;
}

export const CustomAmountInfo: React.FC<CustomAmountInfoProps> = memo(
  ({ children, currency, disablePay }) => {
    useClearConfirmationOnBackSwipe();
    useAutomaticTransactionPayToken({ disable: disablePay });
    useTransactionPayMetrics();

    const { styles } = useStyles(styleSheet, {});
    const [isKeyboardVisible, setKeyboardVisible] = useState(true);
    const { setIsFooterVisible } = useConfirmationContext();
    const availableTokens = useTransactionPayAvailableTokens();
    const hasTokens = availableTokens.length > 0;

    const isResultReady = useIsResultReady({
      isKeyboardVisible,
    });

    const {
      amountFiat,
      amountHuman,
      amountHumanDebounced,
      hasInput,
      isInputChanged,
      updatePendingAmount,
      updatePendingAmountPercentage,
      updateTokenAmount,
    } = useTransactionCustomAmount({ currency });

    const { alertMessage, keyboardAlertMessage, excludeBannerKeys } =
      useTransactionCustomAmountAlerts({
        isInputChanged,
        pendingTokenAmount: amountHumanDebounced,
      });

    useEffect(() => {
      setIsFooterVisible(!isKeyboardVisible);
    }, [isKeyboardVisible, setIsFooterVisible]);

    const handleDone = useCallback(async () => {
      await updateTokenAmount();
      setKeyboardVisible(false);
    }, [updateTokenAmount]);

    const handleAmountPress = useCallback(() => {
      setKeyboardVisible(true);
    }, []);

    return (
      <Box style={styles.container}>
        <Box>
          <CustomAmount
            amountFiat={amountFiat}
            currency={currency}
            hasAlert={Boolean(keyboardAlertMessage)}
            onPress={handleAmountPress}
            disabled={!hasTokens}
          />
          {disablePay !== true && (
            <PayTokenAmount amountHuman={amountHuman} disabled={!hasTokens} />
          )}
          {children}
          {!isKeyboardVisible && (
            <AlertBanner
              blockingOnly
              excludeKeys={excludeBannerKeys}
              includeFields
              inline
            />
          )}
          {disablePay !== true && hasTokens && (
            <InfoSection>
              <PayWithRow />
            </InfoSection>
          )}
          {isKeyboardVisible && <AlertMessage alertMessage={alertMessage} />}
          {isResultReady && (
            <>
              <InfoSection>
                <BridgeFeeRow />
                <BridgeTimeRow />
                <TotalRow />
              </InfoSection>
            </>
          )}
        </Box>
        {isKeyboardVisible && hasTokens && (
          <DepositKeyboard
            alertMessage={keyboardAlertMessage}
            value={amountFiat}
            onChange={updatePendingAmount}
            onDonePress={handleDone}
            onPercentagePress={updatePendingAmountPercentage}
            hasInput={hasInput}
          />
        )}
        {!hasTokens && <BuySection />}
      </Box>
    );
  },
);

export function CustomAmountInfoSkeleton() {
  const { styles } = useStyles(styleSheet, {});

  return (
    <Box style={styles.container}>
      <Box>
        <CustomAmountSkeleton />
        <PayTokenAmountSkeleton />
        <InfoSection>
          <PayWithRowSkeleton />
        </InfoSection>
      </Box>
      <DepositKeyboardSkeleton />
    </Box>
  );
}

function BuySection() {
  const tokens = useAccountTokens({ includeNoBalance: true });
  const requiredTokens = useTransactionPayRequiredTokens();

  const primaryRequiredToken = requiredTokens.find(
    (token) => token.address !== getNativeTokenAddress(token.chainId),
  );

  const asset = tokens.find(
    (token) =>
      token.address?.toLowerCase() ===
        primaryRequiredToken?.address.toLowerCase() &&
      token.chainId === primaryRequiredToken?.chainId,
  );

  const assetId = toCaipAssetType(
    'eip155',
    Number(primaryRequiredToken?.chainId ?? '0x0').toString(),
    'erc20',
    asset?.assetId ?? '0x0',
  );

  const { goToRamps } = useRampNavigation();

  const handleBuyPress = useCallback(() => {
    goToRamps({
      mode: RampMode.AGGREGATOR,
      params: {
        rampType: RampType.BUY,
        intent: { assetId },
      },
    });
  }, [assetId, goToRamps]);

  return (
    <Box alignItems={AlignItems.center} gap={20}>
      <Text variant={TextVariant.BodySM} color={TextColor.Error}>
        Add funds to your wallet to use Predictions.
      </Text>
      <Button
        label={strings('confirm.custom_amount.buy_button')}
        variant={ButtonVariants.Primary}
        onPress={handleBuyPress}
        width={ButtonWidthTypes.Full}
      />
    </Box>
  );
}

function useIsResultReady({
  isKeyboardVisible,
}: {
  isKeyboardVisible: boolean;
}) {
  const quotes = useTransactionPayQuotes();
  const isQuotesLoading = useIsTransactionPayLoading();
  const sourceAmounts = useTransactionPaySourceAmounts();

  return (
    !isKeyboardVisible &&
    (isQuotesLoading || Boolean(quotes?.length) || !sourceAmounts?.length)
  );
}
