import React, {
  useEffect,
  useMemo,
  useCallback,
  useState,
  useRef,
} from 'react';
import { View, Animated } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import Button, {
  ButtonSize,
  ButtonVariants,
} from '../../../../component-library/components/Buttons/Button';
import KeypadComponent, { KeypadChangeData } from '../../../Base/Keypad';
import { getNavigationOptionsTitle } from '../../Navbar';
import { strings } from '../../../../../locales/i18n';
import ErrorBoundary from '../../../Views/ErrorBoundary';
import { useTheme } from '../../../../util/theme';
import { selectBalanceTotal } from '../../../../reducers/rewards/selectors';
import { formatNumber } from '../utils/formatUtils';
import PercentageButtons, {
  PercentageButtonOption,
} from '../components/PercentageButtons/PercentageButtons';
import RewardPointsAnimation, {
  RewardAnimationState,
} from '../components/RewardPointsAnimation';
import { useCommitForDrop } from '../hooks/useCommitForDrop';
import useRewardsToast from '../hooks/useRewardsToast';

const PERCENTAGE_OPTIONS: PercentageButtonOption[] = [
  { value: 10, label: '10%' },
  { value: 25, label: '25%' },
  { value: 50, label: '50%' },
  { value: 100, label: 'Max' },
];

/**
 * DropCommitmentView allows users to enter the amount of points to commit to a drop.
 * Features a numeric keypad, percentage buttons, and displays the user's available balance.
 */
const DropCommitmentView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const { colors } = useTheme();
  const route = useRoute<
    RouteProp<
      {
        params: {
          dropId: string;
          dropName: string;
          hasExistingCommitment: boolean;
          selectedBlockchainAddress?: string;
        };
      },
      'params'
    >
  >();
  const { dropId, dropName, hasExistingCommitment, selectedBlockchainAddress } =
    route.params;
  const { showToast, RewardsToastOptions } = useRewardsToast();

  // Get available points from season status
  const availablePoints = useSelector(selectBalanceTotal) ?? 0;

  // Commit for drop hook
  const { commitForDrop, isCommitting, clearCommitError } = useCommitForDrop();

  // Amount input state
  const [amountString, setAmountString] = useState('0');
  const amountValue = useMemo(
    () => parseInt(amountString, 10) || 0,
    [amountString],
  );

  // Blinking cursor animation
  const cursorOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const blinkAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(cursorOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(cursorOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );
    blinkAnimation.start();

    return () => blinkAnimation.stop();
  }, [cursorOpacity]);

  // Dynamic title based on hasExistingCommitment
  const headerTitle = useMemo(() => {
    if (hasExistingCommitment) {
      return strings('rewards.drops.add_points_for', {
        dropName,
      });
    }
    return strings('rewards.drops.enter_drop', { dropName });
  }, [hasExistingCommitment, dropName]);

  // Set navigation title with back button
  useEffect(() => {
    navigation.setOptions({
      ...getNavigationOptionsTitle(headerTitle, navigation, false, colors),
      headerTitleAlign: 'center',
    });
  }, [colors, navigation, headerTitle]);

  // Handle percentage button press
  const handlePercentagePress = useCallback(
    (percentage: number) => {
      const calculatedAmount = Math.floor((availablePoints * percentage) / 100);
      setAmountString(calculatedAmount.toString());
    },
    [availablePoints],
  );

  // Handle keypad change
  const handleKeypadChange = useCallback(
    ({ value }: KeypadChangeData) => {
      // For points, we only use whole numbers (no decimals)
      // Remove any leading zeros except for a single '0'
      let sanitizedValue = value.replace(/^0+/, '') || '0';

      // Enforce maximum value (can't commit more than available)
      const numericValue = parseInt(sanitizedValue, 10) || 0;
      if (numericValue > availablePoints) {
        sanitizedValue = availablePoints.toString();
      }

      setAmountString(sanitizedValue);
    },
    [availablePoints],
  );

  // Handle commit button press
  const handleCommitPress = useCallback(async () => {
    clearCommitError();
    try {
      const response = await commitForDrop(
        dropId,
        amountValue,
        selectedBlockchainAddress,
      );

      if (response) {
        const toastTitle = hasExistingCommitment
          ? strings('rewards.drops.add_points_success_title')
          : strings('rewards.drops.commit_success_title');
        const toastDescription = hasExistingCommitment
          ? strings('rewards.drops.add_points_success_description')
          : strings('rewards.drops.commit_success_description');

        showToast(RewardsToastOptions.success(toastTitle, toastDescription));
        navigation.goBack();
      }
    } catch (error) {
      showToast(
        RewardsToastOptions.error(
          strings('rewards.drops.commit_error_title'),
          error instanceof Error
            ? error.message
            : strings('rewards.drops.commit_error_description'),
        ),
      );
    }
  }, [
    clearCommitError,
    commitForDrop,
    dropId,
    amountValue,
    selectedBlockchainAddress,
    showToast,
    RewardsToastOptions,
    navigation,
    hasExistingCommitment,
  ]);

  return (
    <ErrorBoundary navigation={navigation} view="DropCommitmentView">
      <View
        style={tw.style('flex-1 bg-background-default')}
        testID="drop-commitment-view"
      >
        {/* Amount Display Section */}
        <Box
          flexDirection={BoxFlexDirection.Column}
          twClassName="flex-1 items-center justify-center px-4"
        >
          {/* Large Amount Display with Blinking Cursor */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="items-center justify-center"
          >
            <Text
              twClassName="text-default text-[64px] leading-[72px] font-['Geist-Medium']"
              testID="commitment-amount-display"
            >
              {formatNumber(amountValue)}
            </Text>
            <Animated.View
              style={[
                tw.style('w-0.5 h-16 bg-primary-default ml-1'),
                { opacity: cursorOpacity },
              ]}
              testID="blinking-cursor"
            />
          </Box>

          {/* Balance Label with Rewards Icon */}
          <Box
            flexDirection={BoxFlexDirection.Row}
            twClassName="items-center mt-2"
            testID="available-points-label"
          >
            <RewardPointsAnimation
              value={availablePoints}
              variant={TextVariant.BodyMd}
              state={RewardAnimationState.Idle}
              height={16}
              width={16}
            />
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-alternative ml-1"
            >
              {strings('rewards.drops.points_available_label')}
            </Text>
          </Box>
        </Box>

        {/* Keypad Section */}
        <Box twClassName="bg-background-alternative rounded-t-2xl pt-4 pb-6">
          {/* Percentage Buttons or Confirm CTA */}
          {amountValue > 0 ? (
            <Box twClassName="px-4 mb-4">
              <Button
                testID="confirm-button"
                label={strings('rewards.drops.confirm')}
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                onPress={handleCommitPress}
                loading={isCommitting}
                style={tw.style('w-full')}
              />
            </Box>
          ) : (
            <PercentageButtons
              options={PERCENTAGE_OPTIONS}
              onPress={handlePercentagePress}
              testID="percentage-buttons"
            />
          )}

          {/* Numeric Keypad */}
          <KeypadComponent
            value={amountString}
            onChange={handleKeypadChange}
            currency="native"
            style={tw.style('px-4')}
            periodButtonProps={{
              isDisabled: true,
              style: tw.style('opacity-0'),
            }}
            testID="commitment-keypad"
          />
        </Box>
      </View>
    </ErrorBoundary>
  );
};

export default DropCommitmentView;
