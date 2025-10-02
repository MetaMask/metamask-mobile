import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  NavigationProp,
  RouteProp,
  StackActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useState, useRef } from 'react';
import { Image, ScrollView, TouchableOpacity } from 'react-native';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Routes from '../../../../../constants/navigation/Routes';
import { usePredictPlaceOrder } from '../../hooks/usePredictPlaceOrder';
import { usePredictBetAmounts } from '../../hooks/usePredictBetAmounts';
import { Side } from '../../types';
import { PredictNavigationParamList } from '../../types/navigation';
import { formatCents, formatPrice } from '../../utils/format';
import PredictAmountDisplay from '../../components/PredictAmountDisplay';
import PredictFeeSummary from '../../components/PredictFeeSummary';
import PredictKeypad, {
  PredictKeypadHandles,
} from '../../components/PredictKeypad';
import { SafeAreaView } from 'react-native-safe-area-context';

const PredictPlaceBet = () => {
  const tw = useTailwind();
  const keypadRef = useRef<PredictKeypadHandles>(null);
  const { goBack, dispatch } =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictPlaceBet'>>();

  const { outcomeId, outcomeToken, market } = route.params;
  const { placeOrder, isLoading } = usePredictPlaceOrder();

  const [currentValue, setCurrentValue] = useState(1);
  const [currentValueUSDString, setCurrentValueUSDString] = useState('1');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const {
    betAmounts: { toWin },
  } = usePredictBetAmounts({
    outcomeToken,
    providerId: market.providerId,
    userBetAmount: currentValue,
  });

  const hasMultipleOutcomes = market.outcomes.length > 1;
  const outcome = market.outcomes.find((o) => o.id === outcomeId);

  const onPlaceBet = () => {
    // Implement cash out action here
    placeOrder({
      outcomeId,
      outcomeTokenId: outcomeToken.id,
      side: Side.BUY,
      size: 1,
      providerId: market.providerId,
    });
    setTimeout(() => {
      dispatch(StackActions.pop());
      dispatch(StackActions.replace(Routes.PREDICT.MARKET_LIST));
    }, 1000);
  };

  const renderHeader = () => (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="w-full gap-4 p-4 border-b border-muted"
    >
      <TouchableOpacity testID="back-button" onPress={() => goBack()}>
        <Icon name={IconName.ArrowLeft} size={IconSize.Md} />
      </TouchableOpacity>
      <Image
        source={{ uri: outcome?.image }}
        style={tw.style('w-10 h-10 rounded')}
      />
      <Box
        flexDirection={BoxFlexDirection.Column}
        twClassName="flex-1 min-w-0 gap-1"
      >
        <Box flexDirection={BoxFlexDirection.Row} twClassName="min-w-0 gap-4">
          <Box twClassName="flex-1 min-w-0">
            <Text
              variant={TextVariant.BodyMDMedium}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {market.title}
            </Text>
          </Box>
        </Box>
        <Box flexDirection={BoxFlexDirection.Row} twClassName="min-w-0 gap-4">
          <Box twClassName="flex-1 min-w-0">
            <Box flexDirection={BoxFlexDirection.Row}>
              {hasMultipleOutcomes && (
                <>
                  <Text
                    variant={TextVariant.BodySMMedium}
                    color={TextColor.Alternative}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {outcome?.groupItemTitle} •
                  </Text>
                  <Text
                    variant={TextVariant.BodySMMedium}
                    color={
                      outcomeToken?.title === 'Yes'
                        ? TextColor.Success
                        : TextColor.Error
                    }
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {' '}
                    {outcomeToken?.title} at{' '}
                    {formatCents(outcomeToken?.price ?? 0)}
                  </Text>
                </>
              )}

              {!hasMultipleOutcomes && (
                <Text
                  variant={TextVariant.BodySMMedium}
                  color={
                    outcomeToken?.title === 'Yes'
                      ? TextColor.Success
                      : TextColor.Error
                  }
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {outcomeToken?.title} at{' '}
                  {formatCents(outcomeToken?.price ?? 0)}
                </Text>
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const renderAmount = () => (
    <ScrollView
      style={tw.style('flex-col mt-12 py-9')}
      contentContainerStyle={tw.style('')}
      showsVerticalScrollIndicator={false}
    >
      <Box
        flexDirection={BoxFlexDirection.Column}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="w-full flex-2 gap-2"
      >
        <Box twClassName="text-center leading-[72px]">
          <PredictAmountDisplay
            amount={currentValueUSDString}
            onPress={() => keypadRef.current?.handleAmountPress()}
            isActive={isInputFocused}
          />
        </Box>
        <Box twClassName="text-center">
          <Text variant={TextVariant.BodyLGMedium} color={TextColor.Success}>
            To win{' '}
            {formatPrice(toWin, {
              minimumDecimals: 2,
              maximumDecimals: 2,
            })}
          </Text>
        </Box>
      </Box>
    </ScrollView>
  );

  const renderBottomContent = () => {
    if (isInputFocused) {
      return null;
    }

    return (
      <Box
        flexDirection={BoxFlexDirection.Column}
        twClassName="border-t border-muted p-4 pb-0 gap-4"
      >
        <Box justifyContent={BoxJustifyContent.Center} twClassName="gap-2">
          <Box twClassName="w-full h-12">
            <Button
              label={`${outcomeToken?.title} • ${formatCents(
                outcomeToken?.price ?? 0,
              )}`}
              variant={ButtonVariants.Secondary}
              onPress={onPlaceBet}
              style={tw.style(
                outcomeToken?.title === 'Yes'
                  ? 'bg-success-default/15'
                  : 'bg-error-default/15',
                outcomeToken?.title === 'Yes'
                  ? 'text-success-default'
                  : 'text-error-default',
              )}
              disabled={isLoading}
              loading={isLoading}
              size={ButtonSize.Lg}
              width={ButtonWidthTypes.Full}
            />
          </Box>
          <Box twClassName="text-center items-center">
            <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
              All payments are made in USDC
            </Text>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <SafeAreaView style={tw.style('flex-1 bg-background-default')}>
      {renderHeader()}
      {renderAmount()}
      <PredictFeeSummary
        isInputFocused={isInputFocused}
        currentValue={currentValue}
      />
      <PredictKeypad
        ref={keypadRef}
        isInputFocused={isInputFocused}
        currentValue={currentValue}
        currentValueUSDString={currentValueUSDString}
        setCurrentValue={setCurrentValue}
        setCurrentValueUSDString={setCurrentValueUSDString}
        setIsInputFocused={setIsInputFocused}
      />
      {renderBottomContent()}
    </SafeAreaView>
  );
};

export default PredictPlaceBet;
