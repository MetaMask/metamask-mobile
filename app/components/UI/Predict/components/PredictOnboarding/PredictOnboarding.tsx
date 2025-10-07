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
import { usePredictOnboarding } from '../../hooks/usePredictOnboarding';

// This is a temporary component that will be removed when the onboarding is fully implemented
const PredictOnboarding: React.FC = () => {
  const { isOnboarded, isLoading, enablePredict } = usePredictOnboarding();
  return (
    <Box
      twClassName="bg-muted rounded-xl py-4"
      testID="predict-onboarding-card"
    >
      {!isOnboarded && (
        <>
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
                Enable Predict
              </Text>
            </Box>
            <TouchableOpacity onPress={enablePredict}>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="flex-row items-center"
              >
                {isLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={IconColor.Alternative}
                  />
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
        </>
      )}
    </Box>
  );
};

export default PredictOnboarding;
