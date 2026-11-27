import { useNavigation } from '@react-navigation/native';
import React, { useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  ActionListItem,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  IconName,
  IconSize,
  Tag,
  TagSeverity,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { selectIsEarnSectionEligible } from '../../../../../components/UI/Earn/selectors/eligibility';
import { selectIsMoneyAccountVisible } from '../../../../../components/UI/Money/selectors/visibility';
import useEarnHighestRate from '../../../../../components/UI/Earn/hooks/useEarnHighestRate';
import useMoneyVaultApy from '../../../../../components/UI/Money/hooks/useMoneyVaultApy';
import { useEarnAnalytics } from '../../../../../components/UI/Earn/hooks/useEarnAnalytics';
import {
  EARN_MODULE_COMPONENT_NAMES,
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_REDIRECT_TARGETS,
} from '../../../../../components/UI/Earn/constants/earnModuleEvents';
import type { EarnRate } from '../../../../../components/UI/Earn/types/earnAssets';
import {
  formatEarnRatePercentage,
  getEarnRateCopy,
} from '../../../../../components/UI/Earn/utils/earnRate';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletActionsBottomSheetSelectorsIDs } from '../../../WalletActions/WalletActionsBottomSheet.testIds';
import type { EarnTradeMenuRowProps } from './EarnTradeMenuRow';

const RedesignedEarnTradeMenuRow = ({
  onActionSelected,
  isDisabled,
}: EarnTradeMenuRowProps) => {
  const navigation = useNavigation();
  const isEarnWalletActionEnabled = useSelector(selectIsEarnSectionEligible);
  const isMoneyAccountVisible = useSelector(selectIsMoneyAccountVisible);
  const { highestRate } = useEarnHighestRate({
    enabled: !isMoneyAccountVisible,
  });
  const { apyPercent: moneyAccountApyPercent } = useMoneyVaultApy({
    enabled: isMoneyAccountVisible,
  });
  const { trackSurfaceClicked: trackEarnSurfaceClicked } = useEarnAnalytics({
    entry_point: EARN_MODULE_ENTRY_POINTS.TRADE_MENU,
  });

  const displayedRate: EarnRate | undefined = isMoneyAccountVisible
    ? moneyAccountApyPercent !== undefined
      ? {
          type: 'APY',
          percentage: moneyAccountApyPercent,
          status: 'ready',
        }
      : undefined
    : highestRate;

  const analyticsRateType: Lowercase<EarnRate['type']> | undefined =
    isMoneyAccountVisible
      ? 'apy'
      : (highestRate?.type.toLowerCase() as
          | Lowercase<EarnRate['type']>
          | undefined);

  const displayedRatePercentage =
    displayedRate?.status === 'ready' ? displayedRate.percentage : undefined;

  const onEarn = useCallback(() => {
    trackEarnSurfaceClicked({
      component_name: EARN_MODULE_COMPONENT_NAMES.EARN_TRADE_MENU_ROW,
      redirect_target: EARN_MODULE_REDIRECT_TARGETS.EARN_SECTION_LIST_VIEW,
      ...(analyticsRateType && {
        rate_type: analyticsRateType,
      }),
      ...(displayedRatePercentage !== undefined && {
        rate_percentage: Number(
          formatEarnRatePercentage(displayedRatePercentage),
        ),
      }),
    });

    onActionSelected(() => {
      navigation.navigate(Routes.EARN.ROOT, {
        screen: Routes.EARN.SEARCH_LIST,
        params: {
          analyticsContext: {
            entry_point: EARN_MODULE_ENTRY_POINTS.TRADE_MENU,
          },
        },
      });
    });
  }, [
    analyticsRateType,
    displayedRatePercentage,
    navigation,
    onActionSelected,
    trackEarnSurfaceClicked,
  ]);

  if (!isEarnWalletActionEnabled) {
    return null;
  }

  return (
    <ActionListItem
      label={
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={2}
        >
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {strings('asset_overview.earn_button')}
          </Text>
          {displayedRate?.status === 'ready' && (
            <Tag
              startIconName={IconName.Sparkle}
              startIconProps={{
                size: IconSize.Sm,
              }}
              severity={TagSeverity.Success}
              testID={WalletActionsBottomSheetSelectorsIDs.EARN_RATE_TAG}
            >
              {getEarnRateCopy({
                percentage: displayedRate.percentage,
                rateType: displayedRate.type,
              })}
            </Tag>
          )}
        </Box>
      }
      description={strings('asset_overview.earn_description')}
      iconName={IconName.Plant}
      onPress={onEarn}
      testID={WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON}
      isDisabled={isDisabled}
    />
  );
};

export default RedesignedEarnTradeMenuRow;
