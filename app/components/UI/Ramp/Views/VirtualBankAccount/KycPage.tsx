import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type { RootStackParamList } from '../../../../../core/NavigationService/types';
import { useKycPageLaunch } from './hooks/useKycPageLaunch';

/**
 * Dedicated owner for presenting or resuming the SumSub KYC flow.
 */
const KycPage = () => {
  const tw = useTailwind();
  const route = useRoute<RouteProp<RootStackParamList, 'RampVbaKyc'>>();
  useKycPageLaunch(route.params);

  return (
    <SafeAreaView
      edges={['right', 'bottom', 'left']}
      style={tw.style('flex-1 bg-default')}
    >
      <Box twClassName="flex-1 justify-center px-6 gap-3">
        <Text variant={TextVariant.HeadingLg} twClassName="text-center">
          {strings('virtual_bank_account.onboarding.processing_title')}
        </Text>
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {strings('virtual_bank_account.onboarding.processing_description')}
        </Text>
      </Box>
    </SafeAreaView>
  );
};

export default KycPage;
