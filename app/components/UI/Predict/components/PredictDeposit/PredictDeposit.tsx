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
import { usePredictDeposit } from '../../hooks/usePredictDeposit';

// This is a temporary component that will be removed when the onboarding is fully implemented
const PredictDeposit: React.FC = () => {
  const { deposit, isLoading: isEnableWalletLoading } = usePredictDeposit();

  const handleDeposit = useCallback(async () => {
    deposit();
  }, [deposit]);

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
            testID="predict-deposit-label"
          >
            Deposit
          </Text>
        </Box>
        <TouchableOpacity onPress={handleDeposit}>
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

export default PredictDeposit;
