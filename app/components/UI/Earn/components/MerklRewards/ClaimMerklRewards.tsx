import React from 'react';
import { View } from 'react-native';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useMerklClaim } from './hooks/useMerklClaim';
import { TokenI } from '../../../Tokens/types';
import styleSheet from './MerklRewards.styles';
import { useStyles } from '../../../../../component-library/hooks';

interface ClaimMerklRewardsProps {
  asset: TokenI;
  onRefetch?: () => Promise<void>;
}

/**
 * Component to display the claim button for Merkl rewards
 */
const ClaimMerklRewards: React.FC<ClaimMerklRewardsProps> = ({
  asset,
  onRefetch,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const {
    claimRewards,
    isClaiming,
    error: claimError,
  } = useMerklClaim({
    asset,
    onClaimSuccess: onRefetch,
  });

  const handleClaim = async () => {
    try {
      await claimRewards();
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
