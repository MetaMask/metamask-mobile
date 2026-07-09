import React, { useCallback } from 'react';
import { Image, Linking } from 'react-native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BottomSheet,
  Button,
  ButtonIcon,
  ButtonIconSize,
  ButtonSize,
  ButtonVariant,
  IconName,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  useNavigation,
  useRoute,
  type NavigationProp,
  type RouteProp,
} from '@react-navigation/native';
import { strings } from '../../../../../../locales/i18n';
import { usePredictOrderPreview } from '../../../Predict/hooks/usePredictOrderPreview';
import {
  Side,
  type PredictMarket,
  type PredictOutcome,
  type PredictOutcomeToken,
} from '../../../Predict/types';
import { formatCents, formatPrice } from '../../../Predict/utils/format';
import { getDisplayBuyPrice } from '../../../Predict/utils/prices';
import Skeleton from '../../../../../component-library/components-temp/Skeleton/Skeleton';
import { useFirstPredictOnUsOrder } from '../../hooks/useFirstPredictOnUsOrder';

export interface FirstPredictOnUsSelectedOrder {
  market: PredictMarket;
  outcome: PredictOutcome;
  outcomeToken: PredictOutcomeToken;
}

interface FirstPredictOnUsOrderSheetRouteParams {
  confirmLabel: string;
  selectedOrder: FirstPredictOnUsSelectedOrder;
  usdAmount: number;
}

type FirstPredictOnUsOrderSheetRoute = RouteProp<
  { FirstPredictOnUsOrderSheet: FirstPredictOnUsOrderSheetRouteParams },
  'FirstPredictOnUsOrderSheet'
>;

const FirstPredictOnUsOrderSheet: React.FC = () => {
  const tw = useTailwind();
  const navigation =
    useNavigation<NavigationProp<ReactNavigation.RootParamList>>();
  const route = useRoute<FirstPredictOnUsOrderSheetRoute>();
  const { confirmLabel, selectedOrder, usdAmount } = route.params;
  const { error, isLoading, submitOrder } = useFirstPredictOnUsOrder();
  const { preview, isLoading: isPreviewLoading } = usePredictOrderPreview({
    marketId: selectedOrder.market.id,
    outcomeId: selectedOrder.outcome.id,
    outcomeTokenId: selectedOrder.outcomeToken.id,
    side: Side.BUY,
    size: usdAmount,
  });
  const toWin = preview?.minAmountReceived ?? 0;
  const displayBuyPrice =
    preview?.sharePrice ?? getDisplayBuyPrice(selectedOrder.outcomeToken) ?? 0;

  const onClose = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleConfirm = useCallback(async () => {
    if (!selectedOrder) {
      return;
    }

    try {
      await submitOrder({
        amountUsd: usdAmount,
        market: selectedOrder.market,
        outcome: selectedOrder.outcome,
        outcomeToken: selectedOrder.outcomeToken,
      });
      onClose();
    } catch {
      // The hook owns error state for the sheet.
    }
  }, [onClose, selectedOrder, submitOrder, usdAmount]);

  const image =
    selectedOrder.outcome.image ||
    selectedOrder.market.image ||
    selectedOrder.market.game?.homeTeam.logo;

  const getTokenImage = (token: PredictOutcomeToken): string | undefined => {
    const tokenTitle = token.title.toLowerCase();
    const game = selectedOrder.market.game;

    if (game) {
      const teams = [game.homeTeam, game.awayTeam];
      const matchingTeam = teams.find((team) =>
        [team.name, team.alias, team.abbreviation]
          .filter(Boolean)
          .some((value) => value?.toLowerCase() === tokenTitle),
      );

      if (matchingTeam?.logo) {
        return matchingTeam.logo;
      }
    }

    return image;
  };

  return (
    <BottomSheet
      isInteractable
      onClose={onClose}
      testID="first-predict-on-us-order-sheet"
    >
      <Box twClassName="p-4 gap-4">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-3 min-w-0"
        >
          {image ? (
            <Image
              source={{ uri: image }}
              style={tw.style('w-12 h-12 rounded')}
            />
          ) : null}
          <Box twClassName="flex-1 min-w-0">
            <Text
              variant={TextVariant.HeadingMd}
              numberOfLines={1}
              testID="first-predict-on-us-order-title"
            >
              {selectedOrder.market.title}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              numberOfLines={1}
              testID="first-predict-on-us-order-subtitle"
            >
              {selectedOrder.outcomeToken.title} {formatCents(displayBuyPrice)}
            </Text>
          </Box>
          <ButtonIcon
            iconName={IconName.Close}
            onPress={onClose}
            size={ButtonIconSize.Md}
            testID="first-predict-on-us-order-close"
          />
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          twClassName="rounded-xl border border-muted overflow-hidden"
        >
          {selectedOrder.outcome.tokens.map((token) => {
            const isSelected = token.id === selectedOrder.outcomeToken.id;
            const tokenImage = getTokenImage(token);

            return (
              <Box
                key={token.id}
                testID={`first-predict-on-us-order-token-${token.id}`}
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName={`flex-1 justify-center gap-2 py-2 ${isSelected ? 'bg-muted' : 'bg-default'}`}
              >
                {tokenImage ? (
                  <Image
                    source={{ uri: tokenImage }}
                    style={tw.style('w-5 h-5 rounded-full')}
                  />
                ) : null}
                <Text
                  variant={TextVariant.BodyMd}
                  color={
                    isSelected ? TextColor.TextDefault : TextColor.TextMuted
                  }
                  numberOfLines={1}
                >
                  {token.title}
                </Text>
              </Box>
            );
          })}
        </Box>

        <Box twClassName="items-center justify-center py-8">
          <Text
            variant={TextVariant.DisplayLg}
            style={tw.style(
              'text-center text-[64px] leading-[72px] font-medium',
            )}
            testID="first-predict-on-us-order-amount"
          >
            ${usdAmount}
          </Text>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="mt-2 justify-center"
            testID="first-predict-on-us-order-to-win"
          >
            <Text
              variant={TextVariant.HeadingLg}
              color={TextColor.SuccessDefault}
              twClassName="font-medium text-center"
            >
              {`${strings('predict.order.to_win')} `}
            </Text>
            {isPreviewLoading ? (
              <Skeleton width={80} height={24} style={tw.style('rounded-md')} />
            ) : (
              <Text
                variant={TextVariant.HeadingLg}
                color={TextColor.SuccessDefault}
                twClassName="font-medium text-center"
              >
                {formatPrice(toWin, {
                  minimumDecimals: 2,
                  maximumDecimals: 2,
                })}
              </Text>
            )}
          </Box>
        </Box>

        <Box
          flexDirection={BoxFlexDirection.Row}
          twClassName="justify-center flex-wrap"
          testID="first-predict-on-us-order-terms"
        >
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {strings('predict.consent_sheet.disclaimer')}{' '}
          </Text>
          <Text
            variant={TextVariant.BodyXs}
            style={tw.style('text-info-default')}
            onPress={() => Linking.openURL('https://polymarket.com/tos')}
          >
            {strings('predict.consent_sheet.learn_more')}
          </Text>
        </Box>

        {error ? (
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.ErrorDefault}
            testID="first-predict-on-us-order-error"
          >
            {error.message}
          </Text>
        ) : null}

        <Button
          isFullWidth
          isLoading={isLoading}
          onPress={handleConfirm}
          size={ButtonSize.Lg}
          testID="first-predict-on-us-order-confirm"
          variant={ButtonVariant.Primary}
        >
          {confirmLabel}
        </Button>
      </Box>
    </BottomSheet>
  );
};

export default FirstPredictOnUsOrderSheet;
