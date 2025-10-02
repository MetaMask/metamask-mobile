import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  ButtonIcon,
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
import React, { useCallback, useMemo, useState } from 'react';
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
import PredictKeypad from '../../components/PredictKeypad';
import { SafeAreaView } from 'react-native-safe-area-context';

const PredictPlaceBet = () => {
  const tw = useTailwind();
  const { goBack, dispatch } =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictPlaceBet'>>();

  const { outcomeId, outcomeToken, market } = route.params;
  const { placeOrder, isLoading } = usePredictPlaceOrder();

  const [currentValue, setCurrentValue] = useState(1);
  const [currentValueUSDString, setCurrentValueUSDString] = useState('1');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [isUserInputActive, setIsUserInputActive] = useState(false);
  const {
    betAmounts: { toWin },
  } = usePredictBetAmounts({
    outcomeToken,
    providerId: market.providerId,
    userBetAmount: currentValue,
  });

  // TODO: change to load fee from provider
  const providerFee = useMemo(() => currentValue * 0, [currentValue]);

  // TODO: change to load fee from metamask
  const metamaskFee = useMemo(() => currentValue * 0.04, [currentValue]);

  const total = useMemo(
    () => currentValue + providerFee + metamaskFee,
    [currentValue, providerFee, metamaskFee],
  );

  const hasMultipleOutcomes = market.outcomes.length > 1;
  const outcome = market.outcomes.find((o) => o.id === outcomeId);

  const handleAmountPress = () => {
    setIsInputFocused(true);
  };

  const handleKeypadAmountPress = (amount: number) => {
    setCurrentValue(amount);
    setCurrentValueUSDString(amount.toString());
  };

  const handleDonePress = () => {
    setIsInputFocused(false);
    setIsUserInputActive(false);
  };

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

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      const previousValue = currentValue.toString();
      // Special handling for decimal point deletion
      // If previous value had a decimal and new value is the same, force remove the decimal
      let adjustedValue = value;

      // Check if we're stuck on a decimal (e.g., "2." -> "2." means delete didn't work)
      if (previousValue.endsWith('.') && value === previousValue) {
        adjustedValue = value.slice(0, -1);
      }
      // Also handle case where decimal is in middle (e.g., "2.5" -> "2." should become "25")
      else if (
        previousValue.includes('.') &&
        value.endsWith('.') &&
        value.length === previousValue.length - 1
      ) {
        // User deleted a digit after decimal, remove the decimal too
        adjustedValue = value.replace('.', '');
      }

      // Set both focus flags immediately to prevent useEffect interference
      if (!isInputFocused) {
        setIsInputFocused(true);
      }
      if (!isUserInputActive) {
        setIsUserInputActive(true);
      }

      // Enforce 9-digit limit (ignoring non-digits). Block the change if exceeded.
      const digitCount = (adjustedValue.match(/\d/g) || []).length;
      if (digitCount > 9) {
        return; // Ignore input that would exceed 9 digits
      }

      // For USD mode, preserve user input exactly as typed for proper delete operations
      // Only limit decimal places if there are digits after the decimal point
      let formattedUSDString = adjustedValue;
      if (adjustedValue.includes('.')) {
        const parts = adjustedValue.split('.');
        const integerPart = parts[0] || '';
        const decimalPart = parts[1] || '';

        // If there's a decimal part, limit it to 2 digits
        if (decimalPart.length > 0) {
          formattedUSDString = integerPart + '.' + decimalPart.slice(0, 2);
        } else {
          // Keep the decimal point if user just typed it (like "2.")
          formattedUSDString = integerPart + '.';
        }
      }

      // Update all states in batch to prevent race conditions
      setCurrentValueUSDString(formattedUSDString);
      setCurrentValue(parseFloat(formattedUSDString));
    },
    [currentValue, isInputFocused, isUserInputActive],
  );

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
            onPress={handleAmountPress}
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

  const renderSummary = () => {
    if (isInputFocused) return null;
    return (
      <Box twClassName="p-4 flex-col gap-2">
        <Box twClassName="flex-row justify-between items-center">
          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="gap-2 items-center"
          >
            <Text color={TextColor.Alternative}>Provider fee</Text>
            <ButtonIcon
              iconName={IconName.Info}
              twClassName="text-alternative"
            />
          </Box>
          <Text color={TextColor.Alternative}>
            {formatPrice(providerFee, {
              maximumDecimals: 2,
            })}
          </Text>
        </Box>
        <Box twClassName="flex-row justify-between items-center">
          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="gap-2 items-center"
          >
            <Text color={TextColor.Alternative}>MetaMask fee</Text>
            <ButtonIcon iconName={IconName.Info} />
          </Box>
          <Text color={TextColor.Alternative}>
            {formatPrice(metamaskFee, {
              maximumDecimals: 2,
            })}
          </Text>
        </Box>
        <Box twClassName="flex-row justify-between items-center">
          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="gap-2 items-center"
          >
            <Text color={TextColor.Alternative}>Total</Text>
            <ButtonIcon iconName={IconName.Info} />
          </Box>
          <Text color={TextColor.Alternative}>
            {formatPrice(total, {
              maximumDecimals: 2,
            })}
          </Text>
        </Box>
      </Box>
    );
  };

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
      {renderSummary()}
      <PredictKeypad
        isInputFocused={isInputFocused}
        currentValueUSDString={currentValueUSDString}
        onKeypadChange={handleKeypadChange}
        onKeypadAmountPress={handleKeypadAmountPress}
        onDonePress={handleDonePress}
      />
      {renderBottomContent()}
    </SafeAreaView>
  );
};

export default PredictPlaceBet;
