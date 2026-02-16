import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextVariant,
  ButtonSize as ButtonSizeHero,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { NavigationProp, useNavigation } from '@react-navigation/native';
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
} from 'react';
import { TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import { PredictPositionsHeaderSelectorsIDs } from '../../Predict.testIds';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import SensitiveText, {
  SensitiveTextLength,
} from '../../../../../component-library/components/Texts/SensitiveText';
import {
  TextVariant as ComponentTextVariant,
  TextColor as ComponentTextColor,
} from '../../../../../component-library/components/Texts/Text/Text.types';
import Routes from '../../../../../constants/navigation/Routes';
import { selectPrivacyMode } from '../../../../../selectors/preferencesController';
import { usePredictBalance } from '../../hooks/usePredictBalance';
import { usePredictClaim } from '../../hooks/usePredictClaim';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
import { useUnrealizedPnL } from '../../hooks/useUnrealizedPnL';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import { selectPredictWonPositions } from '../../selectors/predictController';
import { PredictPosition } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import { formatPercentage, formatPrice } from '../../utils/format';
import ButtonHero from '../../../../../component-library/components-temp/Buttons/ButtonHero';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { PredictEventValues } from '../../constants/eventNames';
import { getEvmAccountFromSelectedAccountGroup } from '../../utils/accounts';

export interface PredictPositionsHeaderHandle {
  refresh: () => Promise<void>;
}

interface PredictPositionsHeaderProps {
  /**
   * Callback when an error occurs during data fetch
   */
  onError?: (error: string | null) => void;
}

const PredictPositionsHeader = forwardRef<
  PredictPositionsHeaderHandle,
  PredictPositionsHeaderProps
>((props, ref) => {
  const { onError } = props;
  const privacyMode = useSelector(selectPrivacyMode);
  const { claim } = usePredictClaim();
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const tw = useTailwind();
  const { executeGuardedAction } = usePredictActionGuard({
    navigation,
  });
  const {
    balance,
    loadBalance,
    isLoading: isBalanceLoading,
    error: balanceError,
  } = usePredictBalance({
    loadOnMount: true,
    refreshOnFocus: true,
  });
  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const selectedAddress = evmAccount?.address ?? '0x0';
  const { isDepositPending } = usePredictDeposit();
  const wonPositions = useSelector(
    selectPredictWonPositions({ address: selectedAddress }),
  );

  const {
    unrealizedPnL,
    isLoading: isUnrealizedPnLLoading,
    loadUnrealizedPnL,
    error: pnlError,
  } = useUnrealizedPnL();

  // Notify parent of errors while keeping state isolated
  useEffect(() => {
    const combinedError = balanceError || pnlError;
    onError?.(combinedError);
  }, [balanceError, pnlError, onError]);

  useEffect(() => {
    if (!isDepositPending) {
      loadBalance({ isRefresh: true });
    }
  }, [isDepositPending, loadBalance]);

  const handleBalanceTouch = () => {
    navigation.navigate(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_BALANCE,
      },
    });
  };

  useImperativeHandle(ref, () => ({
    refresh: async () => {
      await Promise.all([
        loadUnrealizedPnL({ isRefresh: true }),
        loadBalance({ isRefresh: true }),
      ]);
    },
  }));

  const totalClaimableAmount = useMemo(
    () =>
      wonPositions.reduce(
        (sum: number, position: PredictPosition) => sum + position.currentValue,
        0,
      ),
    [wonPositions],
  );

  const unrealizedAmount = unrealizedPnL?.cashUpnl ?? 0;
  const unrealizedPercent = unrealizedPnL?.percentUpnl ?? 0;

  const formatAmount = (amount: number) => {
    const sign = amount >= 0 ? '+' : '-';
    return `${sign}$${Math.abs(amount).toFixed(2)}`;
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${formatPercentage(percent)}`;
  };

  const hasClaimableAmount =
    wonPositions.length > 0 && totalClaimableAmount !== undefined;
  const hasAvailableBalance = balance !== undefined && balance > 0;
  const hasUnrealizedPnL = unrealizedPnL?.cashUpnl !== undefined;

  const handleClaim = async () => {
    await executeGuardedAction(
      async () => {
        await claim();
      },
      { attemptedAction: PredictEventValues.ATTEMPTED_ACTION.CLAIM },
    );
  };

  // Show component if there's a claimable amount, or if we have/are loading balance or P&L data
  if (
    !hasClaimableAmount &&
    !hasAvailableBalance &&
    !hasUnrealizedPnL &&
    !isBalanceLoading &&
    !isUnrealizedPnLLoading
  ) {
    return null;
  }

  return (
    <Box twClassName="gap-4 pb-4 pt-2">
      {hasClaimableAmount && (
        <ButtonHero
          size={ButtonSizeHero.Lg}
          testID={PredictPositionsHeaderSelectorsIDs.CLAIM_BUTTON}
          onPress={handleClaim}
          style={tw.style('w-full')}
        >
          <SensitiveText
            variant={ComponentTextVariant.BodyMD}
            color={ComponentTextColor.Inverse}
            isHidden={privacyMode}
            length={SensitiveTextLength.Medium}
          >
            {strings('predict.claim_amount_text', {
              amount: totalClaimableAmount.toFixed(2),
            })}
          </SensitiveText>
        </ButtonHero>
      )}

      {(hasAvailableBalance ||
        hasUnrealizedPnL ||
        isBalanceLoading ||
        isUnrealizedPnLLoading) && (
        <Box
          style={tw.style(
            'bg-muted rounded-xl pt-3',
            !(hasUnrealizedPnL || isUnrealizedPnLLoading) && 'pb-3',
          )}
          testID="markets-won-card"
        >
          {(hasAvailableBalance || isBalanceLoading) && (
            <TouchableOpacity
              onPress={handleBalanceTouch}
              disabled={isBalanceLoading}
            >
              <Box
                style={tw.style(
                  'px-4',
                  (hasUnrealizedPnL || isUnrealizedPnLLoading) && 'pb-3',
                )}
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    twClassName="text-alternative"
                    testID="markets-won-count"
                  >
                    {strings('predict.available_balance')}
                  </Text>
                </Box>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="flex-row items-center gap-1"
                >
                  {isBalanceLoading ? (
                    <Skeleton
                      width={80}
                      height={20}
                      style={tw.style('rounded-md mr-1')}
                    />
                  ) : (
                    <>
                      <SensitiveText
                        variant={ComponentTextVariant.BodyMD}
                        isHidden={privacyMode}
                        length={SensitiveTextLength.Medium}
                        style={tw.style('text-primary mr-1')}
                        testID="claimable-amount"
                      >
                        {formatPrice(balance, { maximumDecimals: 2 })}
                      </SensitiveText>
                      <Icon
                        name={IconName.ArrowRight}
                        size={IconSize.Sm}
                        color={IconColor.Alternative}
                      />
                    </>
                  )}
                </Box>
              </Box>
            </TouchableOpacity>
          )}
          {(hasUnrealizedPnL || isUnrealizedPnLLoading) && (
            <>
              <Box twClassName="h-px bg-default" />
              <Box
                twClassName="px-4 pb-3 mt-3"
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
              >
                <Text
                  variant={TextVariant.BodyMd}
                  twClassName="text-alternative"
                >
                  {strings('predict.unrealized_pnl_label')}
                </Text>
                {isUnrealizedPnLLoading ? (
                  <Skeleton
                    width={120}
                    height={20}
                    style={tw.style('rounded-md')}
                  />
                ) : (
                  <SensitiveText
                    variant={ComponentTextVariant.BodyMD}
                    color={
                      unrealizedAmount >= 0
                        ? ComponentTextColor.Success
                        : ComponentTextColor.Error
                    }
                    isHidden={privacyMode}
                    length={SensitiveTextLength.Long}
                  >
                    {strings('predict.unrealized_pnl_value', {
                      amount: formatAmount(unrealizedAmount),
                      percent: formatPercent(unrealizedPercent),
                    })}
                  </SensitiveText>
                )}
              </Box>
            </>
          )}
        </Box>
      )}
    </Box>
  );
});

PredictPositionsHeader.displayName = 'PredictAccountState';

export default PredictPositionsHeader;
