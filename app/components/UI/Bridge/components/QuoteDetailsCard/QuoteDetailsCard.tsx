import React, { useMemo } from 'react';
import { TouchableOpacity, Platform, UIManager } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import I18n, { strings } from '../../../../../../locales/i18n';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { useTheme } from '../../../../../util/theme';
import createStyles from './QuoteDetailsCard.styles';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import KeyValueRow from '../../../../../component-library/components-temp/KeyValueRow';
import { TooltipSizes } from '../../../../../component-library/components-temp/KeyValueRow/KeyValueRow.types';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Routes from '../../../../../constants/navigation/Routes';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { useSelector } from 'react-redux';
import {
  selectSourceAmount,
  selectDestToken,
  selectSourceToken,
  selectDestAddress,
  selectIsSwap,
} from '../../../../../core/redux/slices/bridge';
import { selectAccountToGroupMap } from '../../../../../selectors/multichainAccounts/accountTreeController';
import { selectMultichainAccountsState2Enabled } from '../../../../../selectors/featureFlagController/multichainAccounts';
import { selectInternalAccounts } from '../../../../../selectors/accountsController';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { useRewards } from '../../hooks/useRewards';
import { areAddressesEqual } from '../../../../../util/address';
import RewardsAnimations, {
  RewardAnimationState,
} from '../../../Rewards/components/RewardPointsAnimation';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const QuoteDetailsCard: React.FC = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const styles = createStyles(theme);

  const locale = I18n.locale;
  const intlNumberFormatter = getIntlNumberFormatter(locale, {
    maximumFractionDigits: 6,
  });

  const {
    formattedQuoteData,
    activeQuote,
    isLoading: isQuoteLoading,
    shouldShowPriceImpactWarning,
  } = useBridgeQuoteData();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const sourceAmount = useSelector(selectSourceAmount);
  const destAddress = useSelector(selectDestAddress);
  const isSwap = useSelector(selectIsSwap);
  const internalAccounts = useSelector(selectInternalAccounts);
  const accountToGroupMap = useSelector(selectAccountToGroupMap);
  const isMultichainAccountsState2Enabled = useSelector(
    selectMultichainAccountsState2Enabled,
  );
  const {
    estimatedPoints,
    isLoading: isRewardsLoading,
    shouldShowRewardsRow,
    hasError: hasRewardsError,
  } = useRewards({
    activeQuote,
    isQuoteLoading,
  });

  // Get the display name for the destination account
  const destinationDisplayName = useMemo(() => {
    if (!destAddress) return undefined;

    const internalAccount = internalAccounts.find((account) =>
      areAddressesEqual(account.address, destAddress),
    );

    if (!internalAccount) return undefined;

    // Use account group name if available, otherwise use account name
    if (isMultichainAccountsState2Enabled) {
      const accountGroup = accountToGroupMap[internalAccount.id];
      return accountGroup?.metadata.name || internalAccount.metadata.name;
    }

    return internalAccount.metadata.name;
  }, [
    destAddress,
    internalAccounts,
    accountToGroupMap,
    isMultichainAccountsState2Enabled,
  ]);

  const handleSlippagePress = () => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SLIPPAGE_MODAL,
    });
  };

  const handleRecipientPress = () => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.RECIPIENT_SELECTOR_MODAL,
    });
  };

  // Early return for invalid states
  if (
    !sourceToken?.chainId ||
    !destToken?.chainId ||
    !sourceAmount ||
    !formattedQuoteData
  ) {
    return null;
  }

  const { networkFee, rate, priceImpact, slippage } = formattedQuoteData;

  const gasIncluded = !!activeQuote?.quote.gasIncluded;

  const formattedMinToTokenAmount = intlNumberFormatter.format(
    parseFloat(activeQuote?.minToTokenAmount?.amount || '0'),
  );

  return (
    <Box>
      <Box style={styles.container}>
        <KeyValueRow
          field={{
            label: {
              text: strings('bridge.rate'),
              variant: TextVariant.BodyMDMedium,
            },
            tooltip: {
              title: strings('bridge.quote_info_title'),
              content: strings('bridge.quote_info_content'),
              size: TooltipSizes.Sm,
            },
          }}
          value={{
            label: (
              <Text
                variant={TextVariant.BodyMD}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                {rate}
              </Text>
            ),
          }}
        />
        {activeQuote?.quote.gasIncluded ? (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
          >
            <Text variant={TextVariant.BodyMDMedium}>
              {strings('bridge.network_fee')}
            </Text>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={8}
            >
              <Text
                variant={TextVariant.BodyMD}
                style={styles.strikethroughText}
              >
                {networkFee}
              </Text>
              <Text variant={TextVariant.BodyMD}>
                {strings('bridge.included')}
              </Text>
            </Box>
          </Box>
        ) : (
          <KeyValueRow
            field={{
              label: {
                text: strings('bridge.network_fee'),
                variant: TextVariant.BodyMDMedium,
              },
              tooltip: {
                title: strings('bridge.network_fee_info_title'),
                content: strings('bridge.network_fee_info_content'),
                size: TooltipSizes.Sm,
              },
            }}
            value={{
              label: {
                text: networkFee,
                variant: TextVariant.BodyMD,
              },
            }}
          />
        )}

        {priceImpact && (
          <KeyValueRow
            field={{
              label: {
                text: strings('bridge.price_impact'),
                variant: TextVariant.BodyMDMedium,
              },
              tooltip: {
                title: strings('bridge.price_impact_info_title'),
                content: gasIncluded
                  ? strings('bridge.price_impact_info_gasless_description')
                  : strings('bridge.price_impact_info_description'),
                size: TooltipSizes.Sm,
              },
            }}
            value={{
              label: {
                text: priceImpact,
                variant: TextVariant.BodyMD,
                color: shouldShowPriceImpactWarning
                  ? TextColor.Error
                  : undefined,
              },
            }}
          />
        )}

        <KeyValueRow
          field={{
            label: {
              text: strings('bridge.slippage'),
              variant: TextVariant.BodyMDMedium,
            },
            tooltip: {
              title: strings('bridge.slippage_info_title'),
              content: strings('bridge.slippage_info_description'),
              size: TooltipSizes.Sm,
            },
          }}
          value={{
            label: (
              <TouchableOpacity
                onPress={handleSlippagePress}
                activeOpacity={0.6}
                testID="edit-slippage-button"
                style={styles.slippageButton}
              >
                <Text variant={TextVariant.BodyMD}>{slippage}</Text>
                <Icon
                  name={IconName.Edit}
                  size={IconSize.Sm}
                  color={IconColor.Muted}
                />
              </TouchableOpacity>
            ),
          }}
        />

        {!isSwap && (
          <KeyValueRow
            field={{
              label: {
                text: strings('bridge.recipient'),
                variant: TextVariant.BodyMDMedium,
              },
            }}
            value={{
              label: (
                <TouchableOpacity
                  onPress={handleRecipientPress}
                  activeOpacity={0.6}
                  testID="recipient-selector-button"
                  style={styles.slippageButton}
                >
                  <Text
                    variant={TextVariant.BodyMD}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={styles.recipientText}
                  >
                    {destAddress
                      ? destinationDisplayName ||
                        strings('bridge.external_account')
                      : strings('bridge.select_recipient')}
                  </Text>
                  <Icon
                    name={IconName.Edit}
                    size={IconSize.Sm}
                    color={IconColor.Muted}
                  />
                </TouchableOpacity>
              ),
            }}
          />
        )}

        {activeQuote?.minToTokenAmount && (
          <KeyValueRow
            field={{
              label: {
                text: strings('bridge.minimum_received'),
                variant: TextVariant.BodyMDMedium,
              },
              tooltip: {
                title: strings('bridge.minimum_received_tooltip_title'),
                content: strings('bridge.minimum_received_tooltip_content'),
                size: TooltipSizes.Sm,
              },
            }}
            value={{
              label: {
                text: `${formattedMinToTokenAmount} ${destToken?.symbol}`,
                variant: TextVariant.BodyMD,
              },
            }}
          />
        )}

        {/* Estimated Points */}
        {shouldShowRewardsRow && (
          <KeyValueRow
            field={{
              label: {
                text: strings('bridge.points'),
                variant: TextVariant.BodyMDMedium,
              },
              tooltip: {
                title: strings('bridge.points_tooltip'),
                content: `${strings(
                  'bridge.points_tooltip_content_1',
                )}\n\n${strings('bridge.points_tooltip_content_2')}`,
                size: TooltipSizes.Sm,
              },
            }}
            value={{
              label: (
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Center}
                  gap={1}
                >
                  <RewardsAnimations
                    value={estimatedPoints ?? 0}
                    state={
                      isRewardsLoading
                        ? RewardAnimationState.Loading
                        : hasRewardsError
                        ? RewardAnimationState.ErrorState
                        : RewardAnimationState.Idle
                    }
                  />
                </Box>
              ),
              ...(hasRewardsError && {
                tooltip: {
                  title: strings('bridge.points_error'),
                  content: strings('bridge.points_error_content'),
                  size: TooltipSizes.Sm,
                },
              }),
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export default QuoteDetailsCard;
