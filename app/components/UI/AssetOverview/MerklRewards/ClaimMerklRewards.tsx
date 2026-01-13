import React from 'react';
import { View } from 'react-native';
import {
  Button,
  ButtonSize,
  ButtonVariant,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../locales/i18n';
import { useMerklClaim } from '../hooks/useMerklClaim';
import styleSheet from '../AssetOverview.styles';
import { useStyles } from '../../../../component-library/hooks';

/**
 * Component to display the claim button for Merkl rewards
 */
const ClaimMerklRewards: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  const { claimRewards, isClaiming, error: claimError } = useMerklClaim();

  return (
    <View style={styles.claimButtonContainer}>
      <Button
        variant={ButtonVariant.Secondary}
        size={ButtonSize.Lg}
        twClassName="w-full"
        onPress={async () => {
          try {
            await claimRewards();
          } catch (error) {
            console.error('Claim failed:', error);
          }
        }}
        isDisabled={isClaiming}
        isLoading={isClaiming}
        loadingText="Claiming..."
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
