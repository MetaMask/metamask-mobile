import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, {
  useMemo,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from 'react';
import { strings } from '../../../../../../locales/i18n';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import Skeleton from '../../../../../component-library/components/Skeleton/Skeleton';
import { usePredictAccountState } from '../../hooks/usePredictAccountState';
import { usePredictClaimablePositions } from '../../hooks/usePredictClaimablePositions';
import { useUnrealizedPnL } from '../../hooks/useUnrealizedPnL';
import { POLYMARKET_PROVIDER_ID } from '../../providers/polymarket/constants';
import { PredictPosition, PredictPositionStatus } from '../../types';
import { formatPrice } from '../../utils/format';
import { usePredictDeposit } from '../../hooks/usePredictDeposit';
import { TouchableOpacity } from 'react-native';
import { usePredictBalance } from '../../hooks/usePredictBalance';

// NOTE For some reason bg-primary-default and theme.colors.primary.default displaying #8b99ff
const BUTTON_COLOR = '#4459FF';

export interface PredictAccountStateHandle {
  refresh: () => Promise<void>;
}

// TODO: rename to something like `PredictPositionsHeader` (given its purpose has evolved)
const PredictAccountState = forwardRef<PredictAccountStateHandle>((_, ref) => {
  const { address, loadAccountState } = usePredictAccountState();
  const { balance } = usePredictBalance({
    loadOnMount: true,
    refreshOnFocus: true,
  });
  const { positions } = usePredictClaimablePositions({
    loadOnMount: true,
  });
  const {
    unrealizedPnL,
    isFetching: isUnrealizedPnLFetching,
    refetch,
  } = useUnrealizedPnL({
    address,
    providerId: POLYMARKET_PROVIDER_ID,
  });
  const { deposit } = usePredictDeposit();

  const handleDeposit = useCallback(async () => {
    deposit();
  }, [deposit]);

  useImperativeHandle(ref, () => ({
    refresh: async () => {
      await Promise.all([loadAccountState({ isRefresh: true }), refetch()]);
    },
  }));

  const wonPositions = useMemo(
    () =>
      positions.filter(
        (position) => position.status === PredictPositionStatus.WON,
      ),
    [positions],
  );

  const totalClaimableAmount = useMemo(
    () =>
      wonPositions.reduce(
        (sum: number, position: PredictPosition) => sum + position.cashPnl,
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
    return `${sign}${percent.toFixed(1)}%`;
  };

  const hasClaimableAmount = totalClaimableAmount !== undefined;
  const hasAvailableBalance = balance !== undefined && balance > 0;
  const hasUnrealizedPnL = unrealizedPnL?.cashUpnl !== undefined;
  const shouldShowMainCard = hasAvailableBalance || hasUnrealizedPnL;

  return (
    <>
      {hasClaimableAmount && (
        <Box twClassName="py-2">
          <Button
            variant={ButtonVariant.Secondary}
            onPress={() => {
              // TODO: implement claim
            }}
            twClassName="min-w-full bg-primary-default"
            style={{
              backgroundColor: BUTTON_COLOR, // TODO: update once call pull from a tw class
            }}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              twClassName="gap-2"
            >
              <Text variant={TextVariant.BodyMd}>
                {strings('predict.claim_amount_text', {
                  amount: totalClaimableAmount.toFixed(2),
                })}
              </Text>
            </Box>
          </Button>
        </Box>
      )}

      {shouldShowMainCard && (
        <Box
          twClassName="bg-muted rounded-xl pt-4 pb-2 my-4"
          testID="markets-won-card"
        >
          {hasAvailableBalance && (
            <TouchableOpacity onPress={handleDeposit}>
              <Box
                twClassName="px-4 mb-3"
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
                  twClassName="flex-row items-center"
                >
                  <Text
                    variant={TextVariant.BodyMd}
                    twClassName="text-primary mr-1"
                    testID="claimable-amount"
                  >
                    {formatPrice(balance)}
                  </Text>
                  <Icon
                    name={IconName.ArrowRight}
                    size={IconSize.Sm}
                    color={IconColor.Alternative}
                  />
                </Box>
              </Box>
            </TouchableOpacity>
          )}
          {hasUnrealizedPnL && (
            <>
              <Box twClassName="h-px bg-alternative" />
              <Box
                twClassName="px-4 pb-2 mt-3"
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
                  >
                    {strings('predict.unrealized_pnl_label')}
                  </Text>
                </Box>
                {isUnrealizedPnLFetching ? (
                  <Skeleton height={20} width={100} />
                ) : (
                  <Text
                    variant={TextVariant.BodyMd}
                    twClassName={
                      unrealizedAmount >= 0
                        ? 'text-success-default'
                        : 'text-error-default'
                    }
                  >
                    {strings('predict.unrealized_pnl_value', {
                      amount: formatAmount(unrealizedAmount),
                      percent: formatPercent(unrealizedPercent),
                    })}
                  </Text>
                )}
              </Box>
            </>
          )}
        </Box>
      )}
    </>
  );
});

PredictAccountState.displayName = 'PredictAccountState';

export default PredictAccountState;
