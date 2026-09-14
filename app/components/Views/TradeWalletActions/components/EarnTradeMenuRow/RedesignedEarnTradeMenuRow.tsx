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
import useEarnHighestRate from '../../../../../components/UI/Earn/hooks/useEarnHighestRate';
import { useEarnAnalytics } from '../../../../../components/UI/Earn/hooks/useEarnAnalytics';
import {
  EARN_MODULE_COMPONENT_NAMES,
  EARN_MODULE_ENTRY_POINTS,
  EARN_MODULE_REDIRECT_TARGETS,
} from '../../../../../components/UI/Earn/constants/earnModuleEvents';
import { EarnRate } from '../../../../../components/UI/Earn/types/earnAssets';
import { getEarnRateCopy } from '../../../../../components/UI/Earn/utils/earnRate';
import { truncateNumber } from '../../../../../components/UI/Earn/utils/number';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletActionsBottomSheetSelectorsIDs } from '../../../WalletActions/WalletActionsBottomSheet.testIds';
import type { EarnTradeMenuRowProps } from './EarnTradeMenuRow';

const RedesignedEarnTradeMenuRow = ({
  onActionSelected,
  isDisabled,
}: EarnTradeMenuRowProps) => {
  const navigation = useNavigation();
  const isEarnWalletActionEnabled = useSelector(selectIsEarnSectionEligible);
  const { highestRate } = useEarnHighestRate();
  const { trackSurfaceClicked: trackEarnSurfaceClicked } = useEarnAnalytics({
    entry_point: EARN_MODULE_ENTRY_POINTS.TRADE_MENU,
  });

  const onEarn = useCallback(() => {
    trackEarnSurfaceClicked({
      component_name: EARN_MODULE_COMPONENT_NAMES.EARN_TRADE_MENU_ROW,
      redirect_target: EARN_MODULE_REDIRECT_TARGETS.EARN_SECTION_LIST_VIEW,
      ...(highestRate?.type && {
        rate_type: highestRate.type.toLowerCase() as Lowercase<
          EarnRate['type']
        >,
      }),
      ...(highestRate?.status === 'ready' && {
        rate_percentage: Number(truncateNumber(highestRate.percentage)),
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
  }, [highestRate, navigation, onActionSelected, trackEarnSurfaceClicked]);

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
          {highestRate?.status === 'ready' && (
            <Tag
              startIconName={IconName.Sparkle}
              startIconProps={{
                size: IconSize.Sm,
              }}
              severity={TagSeverity.Success}
              testID={WalletActionsBottomSheetSelectorsIDs.EARN_RATE_TAG}
            >
              {getEarnRateCopy({
                percentage: highestRate.percentage,
                rateType: highestRate.type,
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
