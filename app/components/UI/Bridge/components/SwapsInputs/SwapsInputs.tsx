import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../component-library/hooks';
import { getNetworkImageSource } from '../../../../../util/networks';
import {
  TokenInputArea,
  TokenInputAreaRef,
  TokenInputAreaType,
} from '../TokenInputArea';
import { FLipQuoteButton } from '../FlipQuoteButton';
import type { useLatestBalance } from '../../hooks/useLatestBalance';
import type { useSwapsInputs } from '../../hooks/useSwapsInputs';
import { createStyles } from './SwapsInputs.styles';

interface SwapsInputsProps {
  inputRef: React.Ref<TokenInputAreaRef>;
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
  swapInputs: ReturnType<typeof useSwapsInputs>;
  onSourceInputPress: () => void;
  onDestInputPress: () => void;
  sourceTokenAreaTestID: string;
  destTokenAreaTestID: string;
  sourceAmountTypeToggleTestID: string;
}

export const SwapsInputs = ({
  inputRef,
  latestSourceBalance,
  swapInputs,
  onSourceInputPress,
  onDestInputPress,
  sourceTokenAreaTestID,
  destTokenAreaTestID,
  sourceAmountTypeToggleTestID,
}: SwapsInputsProps) => {
  const { styles } = useStyles(createStyles);
  const {
    enabledChainIds,
    destToken,
    destTokenAmount,
    handleDestTokenPress,
    handleFlipTokensPress,
    handleSourceMaxPress,
    handleSourceTokenPress,
    isDestAmountLoading,
    isFlipDisabled,
    sourceAmountInput,
    sourceToken,
  } = swapInputs;

  return (
    <Box style={styles.inputsContainer}>
      <Box style={styles.inputCardsWrapper}>
        <Box style={styles.tokenCard}>
          <TokenInputArea
            ref={inputRef}
            amount={sourceAmountInput.amount}
            selection={sourceAmountInput.selection}
            token={sourceToken}
            tokenBalance={latestSourceBalance?.displayBalance}
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
            onTokenPress={handleSourceTokenPress}
            onMaxPress={handleSourceMaxPress}
            latestAtomicBalance={latestSourceBalance?.atomicBalance}
            isSourceToken
            inputPrefix={sourceAmountInput.inputPrefix}
            secondaryValue={sourceAmountInput.secondaryValue}
            balanceCheckAmount={sourceAmountInput.balanceCheckAmount}
            onAmountTypeTogglePress={
              sourceAmountInput.canToggle
                ? sourceAmountInput.handleToggle
                : undefined
            }
            amountTypeToggleTestID={sourceAmountTypeToggleTestID}
            enabledChainIds={enabledChainIds}
            excludeRwaTokens
          />
        </Box>
        <FLipQuoteButton
          onPress={handleFlipTokensPress}
          disabled={isFlipDisabled}
        />
        <Box style={styles.tokenCard}>
          <TokenInputArea
            amount={destTokenAmount}
            token={destToken}
            networkImageSource={
              destToken
                ? getNetworkImageSource({ chainId: destToken.chainId })
                : undefined
            }
            testID={destTokenAreaTestID}
            tokenType={TokenInputAreaType.Destination}
            onInputPress={onDestInputPress}
            onTokenPress={handleDestTokenPress}
            isLoading={!destTokenAmount && isDestAmountLoading}
            showFiatAmountAsPrimary={sourceAmountInput.isFiatMode}
            enabledChainIds={enabledChainIds}
            excludeRwaTokens
          />
        </Box>
      </Box>
    </Box>
  );
};
