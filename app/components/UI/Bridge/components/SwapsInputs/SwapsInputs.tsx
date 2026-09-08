import React from 'react';
import { Box } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useStyles } from '../../../../../component-library/hooks';
import { getNetworkImageSource } from '../../../../../util/networks';
import {
  TokenInputArea,
  TokenInputAreaRef,
  TokenInputAreaType,
} from '../TokenInputArea';
import { FLipQuoteButton } from '../FlipQuoteButton';
import type { FeatureId } from '@metamask/bridge-controller';
import type { useLatestBalance } from '../../hooks/useLatestBalance';
import type { useSourceAmountInput } from '../../hooks/useSourceAmountInput';
import type { BridgeToken } from '../../types';
import { createStyles } from './SwapsInputs.styles';

interface SwapsInputsProps {
  featureId: FeatureId;
  inputRef: React.Ref<TokenInputAreaRef>;
  sourceToken: BridgeToken | undefined;
  sourceAmountInput: ReturnType<typeof useSourceAmountInput>;
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
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
  featureId,
  inputRef,
  sourceToken,
  sourceAmountInput,
  latestSourceBalance,
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

  return (
    <Box style={styles.inputsContainer}>
      <Box style={styles.inputCardsWrapper}>
        <Box style={styles.tokenCard}>
          <TokenInputArea
            ref={inputRef}
            featureId={featureId}
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
            onTokenPress={onSourceTokenPress}
            onMaxPress={onSourceMaxPress}
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
            hideFiatValueWhenUnpriced
          />
        </Box>
        <FLipQuoteButton onPress={onFlipPress} disabled={isFlipDisabled} />
        <Box
          style={[
            styles.tokenCard,
            hideDestAmount ? styles.compactDestTokenCard : undefined,
          ]}
        >
          <TokenInputArea
            featureId={featureId}
            amount={hideDestAmount ? undefined : destTokenAmount}
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
            showFiatAmountAsPrimary={
              hideDestAmount ? false : sourceAmountInput.isFiatMode
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
