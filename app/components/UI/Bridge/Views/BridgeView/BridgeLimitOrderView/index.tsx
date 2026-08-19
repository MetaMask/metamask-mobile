import React, { useCallback, useRef } from 'react';
import { ScrollView } from 'react-native';
import { useSelector } from 'react-redux';
import { Box } from '@metamask/design-system-react-native';
import ScreenView from '../../../../../Base/ScreenView';
import { useStyles } from '../../../../../../component-library/hooks';
import {
  selectBridgeBalanceRefreshKey,
  selectSourceToken,
} from '../../../../../../core/redux/slices/bridge';
import { selectBridgeLimitOrderFeatureFlags } from '../../../../../../selectors/bridge/featureFlags';
import type { TokenInputAreaRef } from '../../../components/TokenInputArea';
import { GaslessQuickPickOptions } from '../../../components/GaslessQuickPickOptions';
import {
  HardwareWalletUnsupportedBanner,
  InsufficientNativeReserveBanner,
  MissingPriceDataBanner,
  QuoteErrorBanner,
  SwapsBanners,
  TokenWarningBanner,
} from '../../../components/SwapsBanners';
import { SwapsKeypad } from '../../../components/SwapsKeypad';
import type { SwapsKeypadRef } from '../../../components/SwapsKeypad/types';
import { BridgeQuoteDataProvider } from '../../../hooks/useBridgeQuoteData/BridgeQuoteDataContext';
import { useLatestBalance } from '../../../hooks/useLatestBalance';
import { BridgeViewSelectorsIDs } from '../BridgeView.testIds';
import { createStyles } from './BridgeLimitOrderView.styles';
import { LimitOrderSwapInputs } from './LimitOrderSwapInputs';
import { useLimitOrderSwapInputs } from './useLimitOrderSwapInputs';

interface BridgeLimitOrderViewContentProps {
  latestSourceBalance: ReturnType<typeof useLatestBalance>;
}

const BridgeLimitOrderViewContent = ({
  latestSourceBalance,
}: BridgeLimitOrderViewContentProps) => {
  const { styles } = useStyles(createStyles);
  const inputRef = useRef<TokenInputAreaRef>(null);
  const keypadRef = useRef<SwapsKeypadRef>(null);
  const limitOrderFeatureFlags = useSelector(
    selectBridgeLimitOrderFeatureFlags,
  );

  const swapInputs = useLimitOrderSwapInputs({
    latestSourceBalance,
    enabledChainIds: limitOrderFeatureFlags?.enabledChainIds,
  });
  const {
    handleSourceMaxPress,
    handleSourcePresetAmountSelect,
    isQuoteSponsored,
    sourceAmountInput,
    sourceToken,
  } = swapInputs;

  const dismissInputAndKeypad = useCallback(() => {
    inputRef.current?.blur();
    keypadRef.current?.close();
  }, []);

  const openKeypad = useCallback(() => keypadRef.current?.open(), []);
  const closeKeypad = useCallback(() => keypadRef.current?.close(), []);

  return (
    <ScreenView safeAreaEdges={[]} contentContainerStyle={styles.screen}>
      <Box
        style={styles.content}
        testID={BridgeViewSelectorsIDs.LIMIT_ORDER_CONTAINER}
        onStartShouldSetResponder={() => true}
        onResponderRelease={dismissInputAndKeypad}
      >
        <ScrollView
          testID={BridgeViewSelectorsIDs.LIMIT_ORDER_SCROLL}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
        >
          <LimitOrderSwapInputs
            inputRef={inputRef}
            latestSourceBalance={latestSourceBalance}
            swapInputs={swapInputs}
            onSourceInputPress={openKeypad}
            onDestInputPress={closeKeypad}
          />

          <SwapsBanners
            latestSourceAtomicBalance={latestSourceBalance?.atomicBalance}
            onAdjustSourceAmount={handleSourcePresetAmountSelect}
          >
            <HardwareWalletUnsupportedBanner />
            <QuoteErrorBanner />
            <TokenWarningBanner />
            <InsufficientNativeReserveBanner />
            <MissingPriceDataBanner />
          </SwapsBanners>
        </ScrollView>

        <SwapsKeypad
          ref={keypadRef}
          value={sourceAmountInput.keypadValue}
          onChange={sourceAmountInput.handleKeypadChange}
          currency={sourceAmountInput.keypadCurrency}
          decimals={sourceAmountInput.keypadDecimals}
        >
          <GaslessQuickPickOptions
            token={sourceToken}
            tokenBalance={latestSourceBalance?.displayBalance}
            onMaxPress={handleSourceMaxPress}
            isQuoteSponsored={isQuoteSponsored}
            onAmountSelect={handleSourcePresetAmountSelect}
          />
        </SwapsKeypad>
      </Box>
    </ScreenView>
  );
};

const BridgeLimitOrderView = () => {
  const sourceToken = useSelector(selectSourceToken);
  const balanceRefreshKey = useSelector(selectBridgeBalanceRefreshKey);
  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
    balance: sourceToken?.balance,
    refreshKey: balanceRefreshKey,
  });

  return (
    <BridgeQuoteDataProvider
      latestSourceAtomicBalance={latestSourceBalance?.atomicBalance}
    >
      <BridgeLimitOrderViewContent latestSourceBalance={latestSourceBalance} />
    </BridgeQuoteDataProvider>
  );
};

export default BridgeLimitOrderView;
