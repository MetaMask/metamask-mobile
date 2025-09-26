import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import React from 'react';
import { ActivityIndicator, TouchableOpacity } from 'react-native';
import Icon, {
  IconColor,
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { usePredictProxyWallet } from '../../hooks/usePredictProxyWallet';

interface PredictOnboardingProps {}

const PredictOnboarding: React.FC<PredictOnboardingProps> = () => {
  const {
    createProxyWallet,
    isProxyWalletDeployed,
    proxyAddress,
    isLoading,
    createAllowances,
  } = usePredictProxyWallet();

  return (
    <Box twClassName="bg-muted rounded-xl py-4 my-4">
      <Box
        twClassName="px-4 mb-3"
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
        >
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            {isProxyWalletDeployed ? 'Enabled' : 'Enable'} Predict
          </Text>
        </Box>
        {isLoading ? (
          <ActivityIndicator size="small" color={IconColor.Alternative} />
        ) : (
          <TouchableOpacity onPress={createProxyWallet}>
            {isProxyWalletDeployed ? (
              <Text variant={TextVariant.BodyMd} twClassName="text-primary">
                {proxyAddress?.slice(0, 6)}...{proxyAddress?.slice(-4)}
              </Text>
            ) : (
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="flex-row items-center"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  twClassName="text-primary mr-1"
                >
                  Enable
                </Text>
                <Icon
                  name={IconName.ArrowRight}
                  size={IconSize.Sm}
                  color={IconColor.Alternative}
                />
              </Box>
            )}
          </TouchableOpacity>
        )}
      </Box>
      {/* Separator line */}
      <Box twClassName="h-px bg-alternative mb-3" />
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
          <Text variant={TextVariant.BodyMd} twClassName="text-alternative">
            Create allowances
          </Text>
        </Box>
        {isLoading ? (
          <ActivityIndicator size="small" color={IconColor.Alternative} />
        ) : (
          <TouchableOpacity onPress={createAllowances}>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
            >
              <Text variant={TextVariant.BodyMd} twClassName="text-primary">
                Create
              </Text>
              <Icon
                name={IconName.ArrowRight}
                size={IconSize.Sm}
                color={IconColor.Alternative}
              />
            </Box>
          </TouchableOpacity>
        )}
      </Box>
    </Box>
  );
};

export default PredictOnboarding;
