import {
  AvatarTokenSize,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Skeleton } from '../../../../component-library/components-temp/Skeleton';
import { useDispatch } from 'react-redux';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { setTokenSelectorNetworkFilter } from '../../../../core/redux/slices/bridge';
import { strings } from '../../../../../locales/i18n';
import QuickBuyBanners from '../QuickBuyBanners';
import QuickBuyConfirmButton from '../QuickBuyConfirmButton';
import { QuickBuySheetSelectorsIDs } from '../QuickBuySheet.testIds';
import { useQuickBuyContext } from '../useQuickBuyContext';
import QuickBuyDisabledSection from './QuickBuyDisabledSection';
import QuickBuyQuickAmounts from './QuickBuyQuickAmounts';
import QuickBuyRateTag from './QuickBuyRateTag';
import QuickBuyTokenIcon from './QuickBuyTokenIcon';

const QuickBuyActionFooter: React.FC = () => {
  const tw = useTailwind();
  const {
    confirmButtonState,
    getButtonLabel,
    hasValidAmount,
    isConfirmDisabled,
    handleBuy,
    isHardwareSolanaBlocked,
    tradeMode,
    sourceToken,
    sourceBalanceFiat,
    destBalanceFiat,
    selectedReceiveToken,
    features,
    isBlockingQuoteLoad,
    isPriceImpactError,
    estimatedReceiveFiat,
    gasFeeDeductionLabel,
    hasNoPayWithFunds,
    setActiveScreen,
  } = useQuickBuyContext();

  const dispatch = useDispatch();
  const isEstReceiveLoading = hasValidAmount && isBlockingQuoteLoad;
  const pickerToken = tradeMode === 'sell' ? selectedReceiveToken : sourceToken;
  const pickerBalanceFiat =
    tradeMode === 'sell' ? destBalanceFiat : sourceBalanceFiat;

  // Each picker open starts from a fresh network filter, like the standalone
  // Bridge picker: Receive opens on the selected token's chain, Pay with on All.
  const handleOpenPicker = useCallback(() => {
    dispatch(
      setTokenSelectorNetworkFilter(
        tradeMode === 'sell' && selectedReceiveToken
          ? formatChainIdToCaip(selectedReceiveToken.chainId)
          : undefined,
      ),
    );
    setActiveScreen('payWith');
  }, [dispatch, tradeMode, selectedReceiveToken, setActiveScreen]);

  return (
    <Box twClassName="px-4">
      <QuickBuyBanners isHardwareSolanaBlocked={isHardwareSolanaBlocked} />

      {/* Everything between the banners and the CTA depends on a quote that can
          never arrive without funds, so it is dimmed and inert as one block —
          leaving the "Add funds" CTA below as the only live control. */}
      <QuickBuyDisabledSection
        isDisabled={hasNoPayWithFunds}
        testID="quick-buy-disabled-footer"
      >
        {features.quickAmountPills ? (
          <Box twClassName="pb-3">
            <QuickBuyQuickAmounts />
          </Box>
        ) : null}

        {isEstReceiveLoading || estimatedReceiveFiat ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="pb-5"
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
            >
              {isEstReceiveLoading ? (
                <Skeleton
                  width={96}
                  height={16}
                  style={tw.style('rounded-md')}
                  testID={QuickBuySheetSelectorsIDs.EST_RECEIVE_LABEL_LOADING}
                />
              ) : (
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextAlternative}
                >
                  {strings('social_leaderboard.quick_buy.est_receive')}
                </Text>
              )}
              {!isEstReceiveLoading && gasFeeDeductionLabel ? (
                <Box
                  twClassName="rounded-md bg-info-muted px-1.5"
                  testID={QuickBuySheetSelectorsIDs.GAS_FEE_DEDUCTION}
                >
                  <Text
                    variant={TextVariant.BodyXs}
                    color={TextColor.PrimaryDefault}
                  >
                    {gasFeeDeductionLabel}
                  </Text>
                </Box>
              ) : null}
            </Box>

            {isEstReceiveLoading ? (
              <Skeleton
                width={72}
                height={20}
                style={tw.style('rounded-md')}
                testID={QuickBuySheetSelectorsIDs.EST_RECEIVE_LOADING}
              />
            ) : (
              <QuickBuyRateTag
                label={estimatedReceiveFiat as string}
                onPress={
                  features.quoteDetails && !hasNoPayWithFunds
                    ? () => setActiveScreen('quoteDetails')
                    : undefined
                }
                isHighPriceImpact={isPriceImpactError}
              />
            )}
          </Box>
        ) : null}

        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="pb-5"
        >
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {tradeMode === 'sell'
              ? strings('social_leaderboard.quick_buy.receive')
              : strings('social_leaderboard.quick_buy.pay_with')}
          </Text>

          <TouchableOpacity
            disabled={!features.payWithSheet || hasNoPayWithFunds}
            activeOpacity={0.7}
            accessibilityRole="button"
            testID={QuickBuySheetSelectorsIDs.PAY_WITH_BUTTON}
            onPress={handleOpenPicker}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
            >
              {pickerToken ? (
                <QuickBuyTokenIcon
                  token={pickerToken}
                  size={AvatarTokenSize.Sm}
                />
              ) : null}
              <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
                {pickerToken
                  ? pickerBalanceFiat
                    ? `${pickerToken.symbol} (${pickerBalanceFiat})`
                    : pickerToken.symbol
                  : '—'}
              </Text>
              {features.payWithSheet ? (
                <Icon
                  name={IconName.ArrowRight}
                  size={IconSize.Sm}
                  color={IconColor.IconDefault}
                />
              ) : null}
            </Box>
          </TouchableOpacity>
        </Box>
      </QuickBuyDisabledSection>

      <QuickBuyConfirmButton
        state={confirmButtonState}
        label={getButtonLabel()}
        hasValidAmount={hasValidAmount}
        isDisabled={isConfirmDisabled}
        onPress={handleBuy}
        tradeMode={tradeMode}
        testID={QuickBuySheetSelectorsIDs.CONFIRM_BUTTON}
      />
    </Box>
  );
};

export default QuickBuyActionFooter;
