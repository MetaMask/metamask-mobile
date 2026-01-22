import React from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import {
  useNavigation,
  useRoute,
  ParamListBase,
} from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
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
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { RootState } from '../../../../../reducers';
import { EARN_EXPERIENCES } from '../../constants/experiences';

interface ClaimMerklRewardsProps {
  asset: TokenI;
}

/**
 * Component to display the claim button for Merkl rewards
 */
const ClaimMerklRewards: React.FC<ClaimMerklRewardsProps> = ({ asset }) => {
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation<StackNavigationProp<ParamListBase>>();
  const route = useRoute();
  const network = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, asset.chainId as Hex),
  );

  const {
    claimRewards,
    isClaiming,
    error: claimError,
  } = useMerklClaim({ asset });

  const handleClaim = async () => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.EARN_LENDING_WITHDRAW_BUTTON_CLICKED)
        .addProperties({
          action_type: 'claim_rewards',
          token: asset.symbol,
          chain_id: asset.chainId,
          network: network?.name,
          location: 'asset_details',
          experience: EARN_EXPERIENCES.STABLECOIN_LENDING,
        })
        .build(),
    );

    try {
      await claimRewards();
      // Replace the current screen to force re-mount with updated balance
      // This ensures AssetOverview fetches fresh data from the updated controller state
      navigation.replace(route.name, route.params);
    } catch (error) {
      // Error is handled by useMerklClaim hook and displayed via claimError
    }
  };

  return (
    <View style={styles.claimButtonContainer}>
      <Button
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
