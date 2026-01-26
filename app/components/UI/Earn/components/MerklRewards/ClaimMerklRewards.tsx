import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { Hex } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import { useMerklClaim } from './hooks/useMerklClaim';
import { TokenI } from '../../../Tokens/types';
import styleSheet from './MerklRewards.styles';
import { useStyles } from '../../../../../component-library/hooks';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { RootState } from '../../../../../reducers';
import { MUSD_EVENTS_CONSTANTS } from '../../constants/events/musdEvents';

interface ClaimMerklRewardsProps {
  asset: TokenI;
}

/**
 * Component to display the claim button for Merkl rewards
 */
const ClaimMerklRewards: React.FC<ClaimMerklRewardsProps> = ({ asset }) => {
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useAnalytics();
  const network = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, asset.chainId as Hex),
  );

  const {
    claimRewards,
    isClaiming,
    error: claimError,
  } = useMerklClaim({
    asset,
  });

  const handleClaim = async () => {
    const buttonText = strings('asset_overview.merkl_rewards.claim');

    trackEvent(
      createEventBuilder(
        MetaMetricsEvents.MUSD_CLAIM_BONUS_BUTTON_CLICKED.category,
      )
        .addProperties({
          location: MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.ASSET_OVERVIEW,
          action_type: 'claim_bonus',
          button_text: buttonText,
          network_chain_id: asset.chainId ?? null,
          network_name: network?.name ?? null,
          asset_symbol: asset.symbol ?? null,
        })
        .build(),
    );

    try {
      await claimRewards();
    } catch (error) {
      // Error is handled by useMerklClaim hook and displayed via claimError
    }
  };

  return (
    <View style={styles.claimButtonContainer}>
      <Button
        testID="claim-merkl-rewards-button"
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        twClassName="w-full"
        onPress={handleClaim}
        isDisabled={isClaiming}
        isLoading={isClaiming}
      >
        {strings('asset_overview.merkl_rewards.claim')}
      </Button>
      {claimError && (
        <Text
          variant={TextVariant.BodySm}
          twClassName="text-error-default mt-2"
        >
          {claimError}
        </Text>
      )}
    </View>
  );
};

export default ClaimMerklRewards;
