import React, { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';

import ScreenLayout from '../../Aggregator/components/ScreenLayout';
import { Box } from '@metamask/design-system-react-native';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';

import {
  createNavigationDetails,
  useParams,
} from '../../../../../util/navigation/navUtils';
import { strings } from '../../../../../../locales/i18n';
import { getDepositNavbarOptions } from '../../../Navbar';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';

interface AmountInputParams {
  assetId?: string;
}

export const createAmountInputNavDetails =
  createNavigationDetails<AmountInputParams>(Routes.RAMP.AMOUNT_INPUT);

function AmountInput() {
  const navigation = useNavigation();
  const theme = useTheme();
  const { assetId } = useParams<AmountInputParams>();

  useEffect(() => {
    navigation.setOptions(
      getDepositNavbarOptions(
        navigation,
        {
          title: strings('deposit.build_quote.title'),
          showBack: true,
        },
        theme,
      ),
    );
  }, [navigation, theme]);

  return (
    <ScreenLayout>
      <ScreenLayout.Body>
        <Box twClassName="flex-1 items-center justify-center px-4">
          <Text variant={TextVariant.HeadingMD}>Amount Input Screen</Text>
          <Text variant={TextVariant.BodyMD}>
            Asset ID: {assetId || 'None'}
          </Text>
        </Box>
      </ScreenLayout.Body>
    </ScreenLayout>
  );
}

export default AmountInput;
