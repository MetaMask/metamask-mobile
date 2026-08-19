import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { useStyles } from '../../../../../../component-library/hooks';
import { getNetworkImageSource } from '../../../../../../util/networks';
import {
  TokenInputArea,
  TokenInputAreaRef,
  TokenInputAreaType,
} from '../../../components/TokenInputArea';
import { FLipQuoteButton } from '../../../components/FlipQuoteButton';
import type { useLatestBalance } from '../../../hooks/useLatestBalance';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { createStyles } from './BridgeLimitOrderView.styles';
import type { useLimitOrderSwapInputs } from './useLimitOrderSwapInputs';

interface LimitOrderSwapInputsProps {
  inputRef: React.Ref<TokenInputAreaRef>;
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
  swapInputs: ReturnType<typeof useLimitOrderSwapInputs>;
  onSourceInputPress: () => void;
  onDestInputPress: () => void;
}

export const LimitOrderSwapInputs = ({
  inputRef,
  latestSourceBalance,
  swapInputs,
  onSourceInputPress,
  onDestInputPress,
}: LimitOrderSwapInputsProps) => {
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
            testID={BridgeViewSelectorsIDs.LIMIT_SOURCE_TOKEN_AREA}
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
            amountTypeToggleTestID={
              BridgeViewSelectorsIDs.LIMIT_SOURCE_AMOUNT_TYPE_TOGGLE
            }
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
            testID={BridgeViewSelectorsIDs.LIMIT_DEST_TOKEN_AREA}
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
