import React, { useCallback, useEffect, useRef } from 'react';
import { DeviceEventEmitter, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { strings } from '../../../../../../locales/i18n';
import { useMerklClaim } from './hooks/useMerklClaim';
import { usePendingMerklClaim } from './hooks/usePendingMerklClaim';
import { TokenI } from '../../../Tokens/types';
import styleSheet from './MerklRewards.styles';
import { useStyles } from '../../../../../component-library/hooks';
import { MetaMetricsEvents, useMetrics } from '../../../../hooks/useMetrics';
import { selectNetworkConfigurationByChainId } from '../../../../../selectors/networkController';
import { RootState } from '../../../../../reducers';
import { MUSD_EVENTS_CONSTANTS } from '../../constants/events/musdEvents';
import Routes from '../../../../../constants/navigation/Routes';
import { ClaimOnLineaBottomSheetParams } from './ClaimOnLineaBottomSheet/ClaimOnLineaBottomSheet';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../../constants/musd';
import { SCROLL_TO_TOKEN_EVENT } from '../../../Tokens/constants';

interface ClaimMerklRewardsProps {
  asset: TokenI;
}

/**
 * Component to display the claim button for Merkl rewards
 */
const ClaimMerklRewards: React.FC<ClaimMerklRewardsProps> = ({ asset }) => {
  const { styles } = useStyles(styleSheet, {});
  const { trackEvent, createEventBuilder } = useMetrics();
  const navigation = useNavigation();
  const network = useSelector((state: RootState) =>
    selectNetworkConfigurationByChainId(state, asset.chainId as Hex),
  );
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(
    () => () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    },
    [],
  );

  const { claimRewards, isClaiming, error: claimError } = useMerklClaim(asset);
  const { hasPendingClaim } = usePendingMerklClaim();

  // Show loading if currently claiming OR if there's an in-flight claim transaction
  // (e.g., user navigated away and came back while tx is still processing)
  const isLoading = isClaiming || hasPendingClaim;

  const trackClaimButtonClicked = useCallback(() => {
    const buttonText = strings('asset_overview.merkl_rewards.claim');

    trackEvent(
      createEventBuilder(MetaMetricsEvents.MUSD_CLAIM_BONUS_BUTTON_CLICKED)
        .addProperties({
          location: MUSD_EVENTS_CONSTANTS.EVENT_LOCATIONS.ASSET_OVERVIEW,
          action_type: 'claim_bonus',
          button_text: buttonText,
          network_chain_id: asset.chainId,
          network_name: network?.name,
          asset_symbol: asset.symbol,
        })
        .build(),
    );
  }, [
    trackEvent,
    createEventBuilder,
    asset.chainId,
    asset.symbol,
    network?.name,
  ]);

  const handleContinueClaim = useCallback(async () => {
    try {
      const result = await claimRewards();
      // Transaction submitted successfully
      // Toast notifications and balance refresh are handled globally by useMerklClaimStatus
      if (result?.txHash) {
        // Navigate to home page
        navigation.navigate(Routes.WALLET.HOME);

        // Emit event to scroll to Linea mUSD token in the token list
        // Use a small delay to allow navigation to complete
        scrollTimeoutRef.current = setTimeout(() => {
          DeviceEventEmitter?.emit?.(SCROLL_TO_TOKEN_EVENT, {
            address: MUSD_TOKEN_ADDRESS_BY_CHAIN[CHAIN_IDS.LINEA_MAINNET],
            chainId: CHAIN_IDS.LINEA_MAINNET,
          });
        }, 500);
      }
    } catch {
      // Error is handled by useMerklClaim hook and displayed via claimError
    }
  }, [claimRewards, navigation]);

  const handleClaimPress = useCallback(() => {
    trackClaimButtonClicked();

    const params: ClaimOnLineaBottomSheetParams = {
      onContinue: handleContinueClaim,
    };

    navigation.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.MODAL.CLAIM_ON_LINEA,
      params,
    });
  }, [trackClaimButtonClicked, handleContinueClaim, navigation]);

  return (
    <View style={styles.claimButtonContainer}>
      <Button
        testID="claim-merkl-rewards-button"
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        twClassName="w-full"
        onPress={handleClaimPress}
        isDisabled={isLoading}
        isLoading={isLoading}
      >
        {strings('asset_overview.merkl_rewards.claim')}
      </Button>
      {claimError && (
        <Text
          variant={TextVariant.BodySm}
          twClassName="text-error-default mt-2"
        >
          {strings('asset_overview.merkl_rewards.unexpected_error')}
        </Text>
      )}
    </View>
  );
};

export default ClaimMerklRewards;
