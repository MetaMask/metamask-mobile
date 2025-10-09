import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback } from 'react';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { usePredictEnableWallet } from '../../hooks/usePredictEnableWallet';
import { usePredictAccountState } from '../../hooks/usePredictAccountState';

// This is a temporary component that will be removed when the onboarding is fully implemented
const PredictOnboarding: React.FC = () => {
  const { isLoading, hasAllowances, isDeployed, loadAccountState } =
    usePredictAccountState();
  const { enableWallet, isLoading: isEnableWalletLoading } =
    usePredictEnableWallet({ onSuccess: () => loadAccountState() });

  const handleEnablePredict = useCallback(async () => {
    if (isLoading) {
      return;
    }

    await enableWallet();
  }, [enableWallet, isLoading]);

  if (isLoading || (isDeployed && hasAllowances)) {
    return null;
  }

  return (
    <Box
      twClassName="bg-muted rounded-xl py-4"
      testID="predict-onboarding-card"
    >
      <Box
        twClassName="px-4"
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
        >
          <Text
            variant={TextVariant.BodyMd}
            twClassName="text-alternative"
            testID="markets-won-count"
          >
            {isDeployed ? 'Enable allowances' : 'Deploy Predict Wallet'}
          </Text>
        </Box>
        <TouchableOpacity onPress={handleEnablePredict}>
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="flex-row items-center"
          >
            {isEnableWalletLoading ? (
              <ActivityIndicator size="small" color={IconColor.Alternative} />
            ) : (
              <Icon
                name={IconName.ArrowRight}
                size={IconSize.Sm}
                color={IconColor.Alternative}
              />
            )}
          </Box>
        </TouchableOpacity>
      </Box>
    </Box>
  );
};

export default PredictOnboarding;
