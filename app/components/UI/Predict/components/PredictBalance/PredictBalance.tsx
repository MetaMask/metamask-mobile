import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import React, { useCallback } from 'react';
import { ActivityIndicator } from 'react-native';
import {
  IconColor,
  IconName,
} from '../../../../../component-library/components/Icons/Icon';
import { formatPrice } from '../../utils/format';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../../../component-library/components/Buttons/ButtonIcon';

interface PredictBalanceProps {
  balance: number;
  isLoading: boolean;
  address?: string;
}

// This is a temporary component that will be removed when the deposit flow is fully implemented
const PredictBalance: React.FC<PredictBalanceProps> = ({
  balance,
  isLoading,
  address,
}) => {
  const handleCopyToClipboard = useCallback(
    (_text: string) => () => {
      Clipboard.setString(_text);
    },
    [],
  );
  if (isLoading) {
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
          <ActivityIndicator size="small" color={IconColor.Alternative} />
        </Box>
      </Box>
    );
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
            Balance: {formatPrice(balance)}
          </Text>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="flex-row items-center justify-between"
        >
          {address && (
            <Box twClassName="flex-row items-center">
              <Text>
                {address.slice(0, 6)}...{address.slice(-4)}
              </Text>
              <ButtonIcon
                iconName={IconName.Copy}
                size={ButtonIconSizes.Md}
                onPress={handleCopyToClipboard(address)}
              />
            </Box>
          )}
          {isLoading && (
            <ActivityIndicator size="small" color={IconColor.Alternative} />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default PredictBalance;
