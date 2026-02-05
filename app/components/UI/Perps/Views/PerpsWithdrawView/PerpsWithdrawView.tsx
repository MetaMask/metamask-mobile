import { useNavigation } from '@react-navigation/native';
import { captureException } from '@sentry/react-native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import HeaderCenter from '../../../../../component-library/components-temp/HeaderCenter';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { PerpsWithdrawViewSelectorsIDs } from '../../Perps.testIds';
import { strings } from '../../../../../../locales/i18n';
import KeyValueRow from '../../../../../component-library/components-temp/KeyValueRow';
import Icon, {
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Engine from '../../../../../core/Engine';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import Keypad from '../../../../Base/Keypad';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import PerpsBottomSheetTooltip from '../../components/PerpsBottomSheetTooltip';
import { PerpsTooltipContentKey } from '../../components/PerpsBottomSheetTooltip/PerpsBottomSheetTooltip.types';
import {
  HYPERLIQUID_ASSET_CONFIGS,
  USDC_DECIMALS,
  USDC_SYMBOL,
  USDC_TOKEN_ICON_URL,
} from '../../constants/hyperLiquidConfig';
import {
  PERPS_EVENT_PROPERTY,
  PERPS_EVENT_VALUE,
} from '../../constants/eventNames';
import {
  usePerpsMeasurement,
  usePerpsNetwork,
  usePerpsWithdrawQuote,
  useWithdrawTokens,
} from '../../hooks';
import { TraceName } from '../../../../../util/trace';
import { usePerpsLiveAccount } from '../../hooks/stream';
import { usePerpsEventTracking } from '../../hooks/usePerpsEventTracking';
import { useWithdrawValidation } from '../../hooks/useWithdrawValidation';
import { formatPerpsFiat, parseCurrencyString } from '../../utils/formatUtils';

import type { Hex } from '@metamask/utils';
import { AvatarSize } from '../../../../../component-library/components/Avatars/Avatar/Avatar.types';
import AvatarToken from '../../../../../component-library/components/Avatars/Avatar/variants/AvatarToken';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper from '../../../../../component-library/components/Badges/BadgeWrapper';
import { BadgePosition } from '../../../../../component-library/components/Badges/BadgeWrapper/BadgeWrapper.types';
import Button, {
  ButtonSize,
  ButtonVariants,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon/Icon.types';
import { NetworkBadgeSource } from '../../../../UI/AssetOverview/Balance/Balance';
import usePerpsToasts from '../../hooks/usePerpsToasts';

// Constants
const MAX_INPUT_LENGTH = 20;

const PerpsWithdrawView: React.FC = () => {
  const tw = useTailwind();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const navigation = useNavigation();

  // State
  const [withdrawAmount, setWithdrawAmount] = useState<string>(''); // Start with empty string for keypad
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);
  const [selectedTooltip, setSelectedTooltip] =
    useState<PerpsTooltipContentKey | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(true); // Start with keypad open
  const [showPercentageButtons, setShowPercentageButtons] = useState(true); // Show percentage buttons initially
  const [withdrawAmountDetailed, setWithdrawAmountDetailed] =
    useState<string>('');

  // Hooks
  const { showToast, PerpsToastOptions } = usePerpsToasts();
  const { account } = usePerpsLiveAccount();

  const perpsNetwork = usePerpsNetwork();
  const isTestnet = perpsNetwork === 'testnet';

  // Get withdrawal tokens from hook
  const { destToken } = useWithdrawTokens();

  // Parse available balance from perps account state
  const availableBalance = useMemo(() => {
    if (!account?.availableBalance) return 0;
    // Use parseCurrencyString to properly parse formatted currency
    return parseCurrencyString(account.availableBalance);
  }, [account?.availableBalance]);

  const formattedBalance = useMemo(
    () => formatPerpsFiat(availableBalance),
    [availableBalance],
  );

  const hasPositiveBalance = availableBalance > 0;

  // Get withdrawal validation
  const {
    hasAmount,
    isBelowMinimum,
    hasInsufficientBalance,
    getMinimumAmount,
  } = useWithdrawValidation({ withdrawAmount: withdrawAmountDetailed });

  // Check if inputs are valid
  const hasValidInputs =
    hasAmount &&
    !isBelowMinimum &&
    !hasInsufficientBalance &&
    hasPositiveBalance;

  // Get withdrawal quote
  const { formattedQuoteData } = usePerpsWithdrawQuote({
    amount: withdrawAmountDetailed,
  });

  // Calculate destination amount (for now, same as withdrawal amount minus fees)
  const destAmount = useMemo(() => {
    if (!withdrawAmountDetailed || !formattedQuoteData?.networkFee) return '';
    const amount = parseFloat(withdrawAmountDetailed) || 0;
    const fee = parseFloat(formattedQuoteData.networkFee.replace('$', '')) || 0;
    const result = Math.max(0, amount - fee);
    return result.toFixed(2);
  }, [withdrawAmountDetailed, formattedQuoteData]);

  // Performance tracking: Measure withdrawal screen load time until core data is ready
  usePerpsMeasurement({
    traceName: TraceName.PerpsWithdrawView,
    conditions: [
      !!account?.availableBalance,
      !!destToken,
      availableBalance !== undefined,
    ],
  });

  // Track withdrawal input screen viewed - declarative (main's consolidated event)
  usePerpsEventTracking({
    eventName: MetaMetricsEvents.PERPS_SCREEN_VIEWED,
    properties: {
      [PERPS_EVENT_PROPERTY.SCREEN_TYPE]:
        PERPS_EVENT_VALUE.SCREEN_TYPE.WITHDRAWAL,
    },
  });

  useEffect(() => {
    // Start blinking animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [fadeAnim]);

  const handleKeypadChange = useCallback(
    ({ value }: { value: string; valueAsNumber: number }) => {
      // Limit total length
      if (value.length > MAX_INPUT_LENGTH) return;

      // Preserve trailing zeros by storing the raw string value
      setWithdrawAmount(value);
      setWithdrawAmountDetailed(value);
      // Hide percentage buttons when user types a value > 0
      const numValue = parseFloat(value) || 0;
      if (numValue > 0) {
        setShowPercentageButtons(false);
      } else {
        setShowPercentageButtons(true);
      }
    },
    [],
  );

  const handleAmountPress = useCallback(() => {
    setIsInputFocused(true);
  }, []);

  const handlePercentagePress = useCallback(
    (percentage: number) => {
      if (!hasPositiveBalance) return;

      const amount = availableBalance * percentage;
      // Format to 2 or 6 decimal places for USDC
      let formattedAmount = '0';
      if (amount < 0.01) {
        formattedAmount = amount.toFixed(6);
      } else {
        formattedAmount = amount.toFixed(2);
      }
      setWithdrawAmount(formattedAmount);
      setWithdrawAmountDetailed(amount.toFixed(6));

      // Hide percentage buttons after selection and show withdrawal button
      if (amount > 0) {
        setShowPercentageButtons(false);
      }

      // Log for debugging
      DevLogger.log(
        `Percentage selected: ${
          percentage * 100
        }%, Amount: ${formattedAmount}, Available Perps Balance: ${availableBalance}`,
      );
    },
    [availableBalance, hasPositiveBalance],
  );

  const handleMaxPress = useCallback(() => {
    handlePercentagePress(1);
  }, [handlePercentagePress]);

  const handleContinue = useCallback(async () => {
    if (!hasValidInputs || isSubmittingTx) return;

    setIsSubmittingTx(true);

    // Show processing toast immediately
    showToast(
      PerpsToastOptions.accountManagement.withdrawal.withdrawalInProgress,
    );

    // Navigate back immediately to close the withdrawal screen
    navigation.goBack();

    // Execute withdrawal asynchronously
    // Get the correct assetId for USDC on Arbitrum (declare outside try block for error handling)
    const assetId = isTestnet
      ? HYPERLIQUID_ASSET_CONFIGS.usdc.testnet
      : HYPERLIQUID_ASSET_CONFIGS.usdc.mainnet;

    try {
      // Execute withdrawal directly using controller
      const controller = Engine.context.PerpsController;

      // Construct assetId in CAIP format: eip155:{chainId}/erc20:{tokenAddress}/default
      // Convert hex chainId to decimal for CAIP format
      const chainIdDecimal = parseInt(destToken.chainId, 16).toString();

      DevLogger.log('Initiating withdrawal with params:', {
        amount: withdrawAmountDetailed,
        destination: destToken.address,
        assetId,
        chainId: destToken.chainId,
        chainIdDecimal,
      });

      const result = await controller.withdraw({
        amount: withdrawAmountDetailed,
        assetId, // Required CAIP format for USDC withdrawal (with /default suffix)
      });

      if (result.success) {
        DevLogger.log('Withdrawal successful');
      } else {
        DevLogger.log('Withdrawal failed:', result.error);
      }
      // Success/error toast will be shown by usePerpsWithdrawStatus hook
    } catch (error) {
      // Capture exception with withdrawal context
      captureException(
        error instanceof Error ? error : new Error(String(error)),
        {
          tags: {
            component: 'PerpsWithdrawView',
            action: 'financial_withdrawal',
            operation: 'financial_operations',
          },
          extra: {
            withdrawalContext: {
              amount: withdrawAmountDetailed,
              assetId,
              destination: destToken.address,
              chainId: destToken.chainId,
              isTestnet,
            },
          },
        },
      );

      DevLogger.log('Error preparing withdrawal:', error);
    } finally {
      setIsSubmittingTx(false);
    }
  }, [
    hasValidInputs,
    isSubmittingTx,
    showToast,
    PerpsToastOptions.accountManagement.withdrawal.withdrawalInProgress,
    navigation,
    destToken.chainId,
    destToken.address,
    isTestnet,
    withdrawAmountDetailed,
  ]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const formatDisplayAmount = useMemo(() => {
    if (!withdrawAmount || withdrawAmount === '0') {
      return '$0';
    }
    // Show full decimals when keypad is active, formatted when not
    if (isInputFocused) {
      return `$${withdrawAmount}`;
    }
    return formatPerpsFiat(withdrawAmount);
  }, [withdrawAmount, isInputFocused]);

  const formatReceiveAmount = useMemo(() => {
    if (!destAmount) return '-';
    const amount = parseFloat(destAmount);
    if (isNaN(amount) || amount === 0) return '-';
    return formatPerpsFiat(destAmount);
  }, [destAmount]);

  // Tooltip handlers
  const handleTooltipPress = useCallback(
    (contentKey: PerpsTooltipContentKey) => {
      setSelectedTooltip(contentKey);
    },
    [],
  );

  const handleTooltipClose = useCallback(() => {
    setSelectedTooltip(null);
  }, []);

  return (
    <SafeAreaView style={tw.style('flex-1 bg-default')}>
      <Box twClassName="flex-1 bg-default">
        {/* Header */}
        <HeaderCenter
          title={strings('perps.withdrawal.title')}
          onBack={handleBack}
          backButtonProps={{
            testID: PerpsWithdrawViewSelectorsIDs.BACK_BUTTON,
          }}
        />

        {/* Amount Display */}
        <Pressable onPress={handleAmountPress}>
          <Box alignItems={BoxAlignItems.Center} twClassName="py-12 px-4">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              marginBottom={2}
            >
              <Text
                variant={TextVariant.DisplayMD}
                style={tw.style(
                  'text-[54px] leading-[70px] font-medium mb-2 text-default',
                  withdrawAmount === '0' && 'text-alternative',
                )}
              >
                {formatDisplayAmount}
              </Text>
              <Animated.View
                testID="cursor"
                style={[
                  tw.style('w-0.5 h-14 bg-text-default ml-1'),
                  {
                    opacity: fadeAnim,
                  },
                ]}
              />
            </Box>
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.withdrawal.available_balance', {
                amount: formattedBalance,
              })}
            </Text>
          </Box>
        </Pressable>

        {/* Receive Section */}
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          alignItems={BoxAlignItems.Center}
          twClassName="px-5 py-2"
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            <Text variant={TextVariant.BodyMD} color={TextColor.Alternative}>
              {strings('perps.withdrawal.receive')}
            </Text>
            <Pressable
              onPress={() =>
                handleTooltipPress('receive' as PerpsTooltipContentKey)
              }
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon
                name={IconName.Info}
                size={IconSize.Md}
                color={IconColor.Alternative}
              />
            </Pressable>
          </Box>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            <BadgeWrapper
              badgePosition={BadgePosition.BottomRight}
              badgeElement={
                <Badge
                  variant={BadgeVariant.Network}
                  imageSource={NetworkBadgeSource(destToken.chainId as Hex)}
                />
              }
            >
              <AvatarToken
                name={destToken.symbol}
                // hardcoding usdc token image url until we support other withdrawal token types
                imageSource={{ uri: USDC_TOKEN_ICON_URL }}
                size={AvatarSize.Sm}
              />
            </BadgeWrapper>
            <Text variant={TextVariant.BodyMD}>{USDC_SYMBOL}</Text>
          </Box>
        </Box>

        {/* Provider Fee */}
        <Box twClassName="px-5 py-2">
          <KeyValueRow
            field={{
              label: (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="gap-2"
                >
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                  >
                    {strings('perps.withdrawal.provider_fee')}
                  </Text>
                  <Pressable
                    onPress={() => handleTooltipPress('withdrawal_fees')}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon
                      name={IconName.Info}
                      size={IconSize.Md}
                      color={IconColor.Alternative}
                    />
                  </Pressable>
                </Box>
              ),
            }}
            value={{
              label: {
                text: formattedQuoteData?.networkFee || '$1.00',
                variant: TextVariant.BodyMD,
                color: TextColor.Alternative,
              },
            }}
          />
        </Box>

        {/* Estimated Time */}
        <Box twClassName="px-5 py-2">
          <KeyValueRow
            field={{
              label: (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  twClassName="gap-2"
                >
                  <Text
                    variant={TextVariant.BodyMD}
                    color={TextColor.Alternative}
                  >
                    {strings('perps.withdrawal.estimated_time')}
                  </Text>
                </Box>
              ),
            }}
            value={{
              label: {
                text: formattedQuoteData?.estimatedTime,
                variant: TextVariant.BodyMD,
                color: TextColor.Alternative,
              },
            }}
          />
        </Box>

        {/* You'll Receive */}
        <Box twClassName="px-5 py-2">
          <KeyValueRow
            field={{
              label: {
                text: strings('perps.withdrawal.you_will_receive'),
                variant: TextVariant.BodyMD,
              },
            }}
            value={{
              label: {
                text: formatReceiveAmount,
                variant: TextVariant.BodyMD,
              },
            }}
          />
        </Box>

        {/* Spacer to push content to bottom */}
        <Box twClassName="flex-1" />

        {/* Bottom Section - Always at bottom */}
        <Box twClassName="px-4 pb-6">
          {/* Error Message - Always present, visibility controlled */}
          <Box twClassName="mb-4">
            <Text
              variant={TextVariant.BodySM}
              color={TextColor.Error}
              style={tw.style(
                'text-center',
                // Control visibility - opacity 0 when no error
                !(
                  (isBelowMinimum && hasAmount) ||
                  (hasInsufficientBalance && hasAmount)
                ) && 'opacity-0',
              )}
            >
              {hasInsufficientBalance
                ? strings('perps.withdrawal.insufficient_funds')
                : strings('perps.withdrawal.minimum_amount_error', {
                    amount: getMinimumAmount(),
                  })}
            </Text>
          </Box>
          {/* Dynamic action row - either percentage buttons or withdrawal button */}
          <Box twClassName="mb-4">
            {showPercentageButtons && isInputFocused ? (
              /* Show percentage buttons */
              <Box twClassName="flex-row justify-between gap-2 pt-1">
                <Pressable
                  style={({ pressed }) =>
                    tw.style(
                      'flex-1 h-11 rounded-lg justify-center items-center',
                      pressed ? 'bg-pressed' : 'bg-muted',
                    )
                  }
                  onPress={() => handlePercentagePress(0.1)}
                  disabled={!hasPositiveBalance}
                >
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    style={tw.style(!hasPositiveBalance && 'text-disabled')}
                  >
                    10%
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) =>
                    tw.style(
                      'flex-1 h-11 rounded-lg justify-center items-center',
                      pressed ? 'bg-pressed' : 'bg-muted',
                    )
                  }
                  onPress={() => handlePercentagePress(0.25)}
                  disabled={!hasPositiveBalance}
                >
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    style={tw.style(!hasPositiveBalance && 'text-disabled')}
                  >
                    25%
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) =>
                    tw.style(
                      'flex-1 h-11 rounded-lg justify-center items-center',
                      pressed ? 'bg-pressed' : 'bg-muted',
                    )
                  }
                  onPress={() => handlePercentagePress(0.5)}
                  disabled={!hasPositiveBalance}
                >
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    style={tw.style(!hasPositiveBalance && 'text-disabled')}
                  >
                    50%
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) =>
                    tw.style(
                      'flex-1 h-11 rounded-lg justify-center items-center',
                      pressed ? 'bg-pressed' : 'bg-muted',
                    )
                  }
                  onPress={handleMaxPress}
                  disabled={!hasPositiveBalance}
                >
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    style={tw.style(!hasPositiveBalance && 'text-disabled')}
                  >
                    Max
                  </Text>
                </Pressable>
              </Box>
            ) : (
              <Button
                variant={ButtonVariants.Primary}
                size={ButtonSize.Lg}
                label={strings('perps.withdrawal.withdraw')}
                onPress={handleContinue}
                loading={isSubmittingTx}
                disabled={!hasValidInputs || isSubmittingTx}
                testID={PerpsWithdrawViewSelectorsIDs.CONTINUE_BUTTON}
                width={ButtonWidthTypes.Full}
              />
            )}
          </Box>

          {/* Numeric Keypad - Always visible */}
          {isInputFocused && (
            <Keypad
              value={withdrawAmount}
              onChange={handleKeypadChange}
              currency={USDC_SYMBOL}
              decimals={USDC_DECIMALS}
            />
          )}
        </Box>
      </Box>

      {/* Tooltip Bottom Sheet */}
      {selectedTooltip && (
        <PerpsBottomSheetTooltip
          isVisible
          onClose={handleTooltipClose}
          contentKey={selectedTooltip}
          testID={PerpsWithdrawViewSelectorsIDs.BOTTOM_SHEET_TOOLTIP}
          key={selectedTooltip}
        />
      )}
    </SafeAreaView>
  );
};

export default PerpsWithdrawView;
