import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { ScrollView } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { BottomSheetRef } from '../../../../../component-library/components/BottomSheets/BottomSheet';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import PredictAmountDisplay from '../../components/PredictAmountDisplay';
import { PredictBuyPreviewHeaderTitle } from '../../components/PredictBuyPreviewHeader';
import PredictFeeBreakdownSheet from '../../components/PredictFeeBreakdownSheet';
import PredictFeeSummary from '../../components/PredictFeeSummary';
import PredictKeypad, {
  PredictKeypadHandles,
} from '../../components/PredictKeypad';
import { usePredictActiveOrder } from '../../hooks/usePredictActiveOrder';
import { usePredictBalance } from '../../hooks/usePredictBalance';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
import { usePredictOrderPreview } from '../../hooks/usePredictOrderPreview';
import { usePredictRewards } from '../../hooks/usePredictRewards';
import { Side } from '../../types';
import { formatPrice } from '../../utils/format';
import { useConfirmationContext } from '../../../../Views/confirmations/context/confirmation-context';
import { POLYGON_USDCE } from '../../../../Views/confirmations/constants/predict';
import { useAddToken } from '../../../../Views/confirmations/hooks/tokens/useAddToken';
import useClearConfirmationOnBackSwipe from '../../../../Views/confirmations/hooks/ui/useClearConfirmationOnBackSwipe';
import useNavbar from '../../../../Views/confirmations/hooks/ui/useNavbar';
import { NavbarOverrides } from '../../../../Views/confirmations/components/UI/navbar/navbar';

const MINIMUM_BET = 1;

export function PredictDepositAndOrderInfo() {
  const activeOrder = usePredictActiveOrder();

  const market = activeOrder?.market;
  const outcome = activeOrder?.outcome;
  const outcomeToken = activeOrder?.outcomeToken;

  const renderHeaderTitle = useCallback(
    () =>
      outcomeToken ? (
        <PredictBuyPreviewHeaderTitle
          title={market?.title ?? ''}
          outcomeImage={outcome?.image}
          outcomeGroupTitle={outcome?.groupItemTitle ?? ''}
          outcomeToken={outcomeToken}
        />
      ) : null,
    [market?.title, outcome?.image, outcome?.groupItemTitle, outcomeToken],
  );

  const navbarOverrides = useMemo<NavbarOverrides>(
    () => ({
      headerTitleAlign: 'left' as const,
      headerTitle: renderHeaderTitle,
    }),
    [renderHeaderTitle],
  );

  useNavbar(strings('confirm.title.predict_deposit'), true, navbarOverrides);
  useClearConfirmationOnBackSwipe();

  useAddToken({
    chainId: CHAIN_IDS.POLYGON,
    decimals: POLYGON_USDCE.decimals,
    name: POLYGON_USDCE.name,
    symbol: POLYGON_USDCE.symbol,
    tokenAddress: POLYGON_USDCE.address,
  });

  const tw = useTailwind();
  const keypadRef = useRef<PredictKeypadHandles>(null);
  const feeBreakdownSheetRef = useRef<BottomSheetRef>(null);
  const previousValueRef = useRef(0);
  const { setIsFooterVisible } = useConfirmationContext();

  const { data: balance = 0, isLoading: isBalanceLoading } =
    usePredictBalance();
  const { deposit } = usePredictDeposit();

  const [currentValue, setCurrentValue] = useState(0);
  const [currentValueUSDString, setCurrentValueUSDString] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(true);
  const [isUserInputChange, setIsUserInputChange] = useState(false);
  const [isFeeBreakdownVisible, setIsFeeBreakdownVisible] = useState(false);

  const {
    preview,
    error: previewError,
    isCalculating,
  } = usePredictOrderPreview({
    marketId: market?.id ?? '',
    outcomeId: outcome?.id ?? '',
    outcomeTokenId: outcomeToken?.id ?? '',
    side: Side.BUY,
    size: activeOrder ? currentValue : 0,
    autoRefreshTimeout: 1000,
  });

  useEffect(() => {
    if (!isCalculating) {
      setIsUserInputChange(false);
      if (currentValue === 0) {
        previousValueRef.current = 0;
      }
      return;
    }

    if (
      currentValue > 0 &&
      currentValue !== previousValueRef.current &&
      isCalculating
    ) {
      setIsUserInputChange(true);
    }

    previousValueRef.current = currentValue;
  }, [currentValue, isCalculating]);

  useEffect(() => {
    setIsFooterVisible(!isInputFocused && currentValue >= MINIMUM_BET);
  }, [isInputFocused, currentValue, setIsFooterVisible]);

  const isBelowMinimum = currentValue > 0 && currentValue < MINIMUM_BET;

  const toWin = preview?.minAmountReceived ?? 0;
  const metamaskFee = preview?.fees?.metamaskFee ?? 0;
  const providerFee = preview?.fees?.providerFee ?? 0;
  const total = currentValue + providerFee + metamaskFee;

  const {
    enabled: isRewardsEnabled,
    isLoading: isRewardsLoading,
    accountOptedIn: isAccountOptedIntoRewards,
    rewardsAccountScope,
    estimatedPoints: estimatedRewardsPoints,
    hasError: isRewardsError,
  } = usePredictRewards(
    previewError ? undefined : (preview?.fees?.totalFee ?? 0),
  );

  const shouldShowRewardsRow =
    isRewardsEnabled && currentValue > 0 && isAccountOptedIntoRewards != null;

  const handleFeesInfoPress = useCallback(() => {
    setIsFeeBreakdownVisible(true);
  }, []);

  const handleFeeBreakdownClose = useCallback(() => {
    setIsFeeBreakdownVisible(false);
  }, []);

  useEffect(() => {
    if (isFeeBreakdownVisible) {
      feeBreakdownSheetRef.current?.onOpenBottomSheet();
    }
  }, [isFeeBreakdownVisible]);

  if (!activeOrder || !market || !outcome || !outcomeToken) {
    return null;
  }

  const renderAmount = () => (
    <ScrollView
      style={tw.style('flex-col')}
      contentContainerStyle={tw.style('flex-grow justify-center')}
      showsVerticalScrollIndicator={false}
    >
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="w-full"
      >
        <Box twClassName="text-center leading-[72px]">
          <PredictAmountDisplay
            amount={currentValueUSDString}
            onPress={() => keypadRef.current?.handleAmountPress()}
            isActive={isInputFocused}
            hasError={false}
          />
        </Box>
        <Box twClassName="text-center mt-2">
          {isBalanceLoading ? (
            <Skeleton width={120} height={20} />
          ) : (
            <Text
              variant={TextVariant.BodyMd}
              color={TextColor.TextAlternative}
            >
              {`${strings('predict.order.available')}: `}
              {formatPrice(balance, { minimumDecimals: 2, maximumDecimals: 2 })}
            </Text>
          )}
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Center}
          twClassName="mt-2"
        >
          <Text
            variant={TextVariant.BodyLg}
            twClassName="font-medium"
            color={TextColor.SuccessDefault}
          >
            {`${strings('predict.order.to_win')} `}
          </Text>
          {isCalculating && isUserInputChange ? (
            <Skeleton width={80} height={24} style={tw.style('rounded-md')} />
          ) : (
            <Text
              variant={TextVariant.BodyLg}
              twClassName="font-medium"
              color={TextColor.SuccessDefault}
            >
              {formatPrice(toWin, {
                minimumDecimals: 2,
                maximumDecimals: 2,
              })}
            </Text>
          )}
        </Box>
      </Box>
    </ScrollView>
  );

  const renderErrorMessage = () => {
    if (isBalanceLoading) {
      return null;
    }

    if (isBelowMinimum) {
      return (
        <Box twClassName="px-12 pb-4">
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            style={tw.style('text-center')}
          >
            {strings('predict.order.prediction_minimum_bet', {
              amount: formatPrice(MINIMUM_BET, {
                minimumDecimals: 2,
                maximumDecimals: 2,
              }),
            })}
          </Text>
        </Box>
      );
    }

    return null;
  };

  return (
    <Box twClassName="flex-1">
      {renderAmount()}
      <PredictFeeSummary
        disabled={isInputFocused}
        total={total}
        metamaskFee={metamaskFee}
        providerFee={providerFee}
        shouldShowRewardsRow={shouldShowRewardsRow}
        rewardsAccountScope={rewardsAccountScope}
        accountOptedIn={isAccountOptedIntoRewards}
        estimatedPoints={estimatedRewardsPoints}
        isLoadingRewards={
          (isCalculating && isUserInputChange) || isRewardsLoading
        }
        hasRewardsError={isRewardsError}
        onFeesInfoPress={handleFeesInfoPress}
      />
      {renderErrorMessage()}
      <PredictKeypad
        ref={keypadRef}
        isInputFocused={isInputFocused}
        currentValue={currentValue}
        currentValueUSDString={currentValueUSDString}
        setCurrentValue={setCurrentValue}
        setCurrentValueUSDString={setCurrentValueUSDString}
        setIsInputFocused={setIsInputFocused}
        onAddFunds={deposit}
      />
      {isFeeBreakdownVisible && (
        <PredictFeeBreakdownSheet
          ref={feeBreakdownSheetRef}
          providerFee={providerFee}
          metamaskFee={metamaskFee}
          onClose={handleFeeBreakdownClose}
        />
      )}
    </Box>
  );
}
