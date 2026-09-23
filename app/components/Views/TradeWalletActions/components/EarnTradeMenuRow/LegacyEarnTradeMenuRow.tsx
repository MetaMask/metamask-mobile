import { useNavigation } from '@react-navigation/native';
import React, { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { ActionListItem, IconName } from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { earnSelectors } from '../../../../../selectors/earnController/earn';
import { selectChainId } from '../../../../../selectors/networkController';
import { getDecimalChainId } from '../../../../../util/networks';
import { useAnalytics } from '../../../../../components/hooks/useAnalytics/useAnalytics';
import { EARN_INPUT_VIEW_ACTIONS } from '../../../../../components/UI/Earn/Views/EarnInputView/EarnInputView.types';
import {
  selectPooledStakingEnabledFlag,
  selectStablecoinLendingEnabledFlag,
} from '../../../../../components/UI/Earn/selectors/featureFlags';
import { EVENT_LOCATIONS as STAKE_EVENT_LOCATIONS } from '../../../../../components/UI/Stake/constants/events';
import useStakingEligibility from '../../../../../components/UI/Stake/hooks/useStakingEligibility';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletActionsBottomSheetSelectorsIDs } from '../../../WalletActions/WalletActionsBottomSheet.testIds';
import type { EarnTradeMenuRowProps } from './EarnTradeMenuRow';

const LegacyEarnTradeMenuRow = ({
  onActionSelected,
  isDisabled,
}: EarnTradeMenuRowProps) => {
  const { navigate } = useNavigation();
  const chainId = useSelector(selectChainId);
  const isPooledStakingEnabled = useSelector(selectPooledStakingEnabledFlag);
  const isStablecoinLendingEnabled = useSelector(
    selectStablecoinLendingEnabledFlag,
  );
  const { isEligible: isEarnEligible } = useStakingEligibility();
  const { earnTokens } = useSelector(earnSelectors.selectEarnTokens);
  const { trackEvent, createEventBuilder } = useAnalytics();

  const isEarnWalletActionEnabled = useMemo(() => {
    if (
      !isStablecoinLendingEnabled ||
      (earnTokens.length <= 1 &&
        earnTokens[0]?.isETH &&
        !isPooledStakingEnabled)
    ) {
      return false;
    }
    return true;
  }, [isStablecoinLendingEnabled, earnTokens, isPooledStakingEnabled]);

  const onEarn = useCallback(() => {
    onActionSelected(() => {
      navigate('StakeModals', {
        screen: Routes.STAKING.MODALS.EARN_TOKEN_LIST,
        params: {
          tokenFilter: {
            includeNativeTokens: true,
            includeStakingTokens: false,
            includeLendingTokens: true,
            includeReceiptTokens: false,
          },
          onItemPressScreen: EARN_INPUT_VIEW_ACTIONS.DEPOSIT,
        },
      });

      trackEvent(
        createEventBuilder(MetaMetricsEvents.EARN_BUTTON_CLICKED)
          .addProperties({
            text: 'Earn',
            location: STAKE_EVENT_LOCATIONS.WALLET_ACTIONS_BOTTOM_SHEET,
            chain_id_destination: getDecimalChainId(chainId),
          })
          .build(),
      );
    });
  }, [chainId, createEventBuilder, navigate, onActionSelected, trackEvent]);

  if (!isEarnWalletActionEnabled || !isEarnEligible) {
    return null;
  }

  return (
    <ActionListItem
      label={strings('asset_overview.earn_button')}
      description={strings('asset_overview.earn_description')}
      iconName={IconName.Stake}
      onPress={onEarn}
      testID={WalletActionsBottomSheetSelectorsIDs.EARN_BUTTON}
      isDisabled={isDisabled}
    />
  );
};

export default LegacyEarnTradeMenuRow;
