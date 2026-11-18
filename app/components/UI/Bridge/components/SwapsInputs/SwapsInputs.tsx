import React from 'react';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { getNetworkImageSource } from '../../../../../util/networks';
import {
  TokenInputArea,
  TokenInputAreaRef,
  TokenInputAreaType,
} from '../TokenInputArea';
import { FLipQuoteButton } from '../FlipQuoteButton';
import type { useSourceAmountInput } from '../../hooks/useSourceAmountInput';
import type { BridgeToken } from '../../types';
import { useBridgeSession } from '../../hooks/useBridgeSession';
import { useTokenFiatRate } from '../../hooks/useTokenFiatRate';
import { getMoneyInputPrefix } from '../../utils/currencyUtils';
import { hasMissingTokenFiatRate } from '../../utils/hasMissingTokenFiatRate';
import { createStyles } from './SwapsInputs.styles';

interface SwapsInputsProps {
  inputRef: React.Ref<TokenInputAreaRef>;
  sourceToken: BridgeToken | undefined;
  sourceAmountInput: ReturnType<typeof useSourceAmountInput>;
  destToken: BridgeToken | undefined;
  destTokenAmount: string | undefined;
  isDestAmountLoading: boolean;
  isFlipDisabled: boolean;
  onSourceInputPress: () => void;
  onSourceTokenPress: () => void;
  onSourceMaxPress: () => void;
  onFlipPress: () => void;
  onDestInputPress: () => void;
  onDestTokenPress: () => void;
  sourceTokenAreaTestID: string;
  destTokenAreaTestID: string;
  sourceAmountTypeToggleTestID: string;
  hideDestAmount?: boolean;
  destAmountReplacementLabelTestID?: string;
}

export const SwapsInputs = ({
  inputRef,
  sourceToken,
  sourceAmountInput,
  destToken,
  destTokenAmount,
  isDestAmountLoading,
  isFlipDisabled,
  onSourceInputPress,
  onSourceTokenPress,
  onSourceMaxPress,
  onFlipPress,
  onDestInputPress,
  onDestTokenPress,
  sourceTokenAreaTestID,
  destTokenAreaTestID,
  sourceAmountTypeToggleTestID,
  hideDestAmount = false,
  destAmountReplacementLabelTestID,
}: SwapsInputsProps) => {
  const { styles } = useStyles(createStyles);
  const { latestSourceBalance } = useBridgeSession();
  const currentCurrency = useSelector(selectCurrentCurrency);
  const destFiatRate = useTokenFiatRate(destToken);
  const destAmount = hideDestAmount ? undefined : destTokenAmount;
  const destInputPrefix = getMoneyInputPrefix({
    isMoneyToken: Boolean(destToken?.isMoneyToken),
    showFiatAmountAsPrimary: hideDestAmount
      ? false
      : Boolean(destToken?.isMoneyToken || sourceAmountInput.isFiatMode),
    hideFiatValue: hasMissingTokenFiatRate(destToken, destFiatRate),
    amount: destAmount,
    currency: currentCurrency,
  });

  return (
    <Box style={styles.inputsContainer}>
      <Box style={styles.inputCardsWrapper}>
        <Box
          style={[
            styles.tokenCard,
            sourceToken?.isMoneyToken && styles.moneyTokenCard,
          ]}
        >
          <TokenInputArea
            ref={inputRef}
            amount={sourceAmountInput.amount}
            selection={sourceAmountInput.selection}
            token={sourceToken}
            tokenBalance={latestSourceBalance?.displayBalance}
            latestAtomicBalance={latestSourceBalance?.atomicBalance}
            networkImageSource={
              sourceToken?.chainId
                ? getNetworkImageSource({ chainId: sourceToken.chainId })
                : undefined
            }
            testID={sourceTokenAreaTestID}
            tokenType={TokenInputAreaType.Source}
            onInputPress={onSourceInputPress}
            onFocus={sourceAmountInput.handleFocus}
            onSelectionChange={sourceAmountInput.handleSelectionChange}
            onTokenPress={onSourceTokenPress}
            onMaxPress={onSourceMaxPress}
            isSourceToken
            inputPrefix={sourceAmountInput.inputPrefix}
            secondaryValue={
              sourceToken?.isMoneyToken
                ? strings('money.usd_name')
                : sourceAmountInput.secondaryValue
            }
            balanceCheckAmount={sourceAmountInput.balanceCheckAmount}
            onAmountTypeTogglePress={
              sourceAmountInput.canToggle
                ? sourceAmountInput.handleToggle
                : undefined
            }
            amountTypeToggleTestID={sourceAmountTypeToggleTestID}
            hideFiatValueWhenUnpriced
            showFiatAmountAsPrimary={
              sourceToken?.isMoneyToken ? true : undefined
            }
          />
        </Box>
        <FLipQuoteButton onPress={onFlipPress} disabled={isFlipDisabled} />
        <Box
          style={[
            styles.tokenCard,
            hideDestAmount ? styles.compactDestTokenCard : undefined,
            destToken?.isMoneyToken && styles.moneyTokenCard,
          ]}
        >
          <TokenInputArea
            amount={destAmount}
            token={destToken}
            networkImageSource={
              destToken
                ? getNetworkImageSource({ chainId: destToken.chainId })
                : undefined
            }
            testID={destTokenAreaTestID}
            tokenType={TokenInputAreaType.Destination}
            onInputPress={onDestInputPress}
            onTokenPress={onDestTokenPress}
            isLoading={
              hideDestAmount ? false : !destTokenAmount && isDestAmountLoading
            }
            inputPrefix={destInputPrefix}
            showFiatAmountAsPrimary={
              hideDestAmount
                ? false
                : destToken?.isMoneyToken || sourceAmountInput.isFiatMode
            }
            hideAmount={hideDestAmount}
            amountReplacementLabel={
              hideDestAmount ? strings('bridge.recurring.you_get') : undefined
            }
            amountReplacementLabelTestID={destAmountReplacementLabelTestID}
            hideFiatValueWhenUnpriced
          />
        </Box>
      </Box>
    </Box>
  );
};
