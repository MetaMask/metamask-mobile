import React, { View } from 'react-native';
import ScreenView from '../../../../Base/ScreenView';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useEffect } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import { getHeaderCompactStandardNavbarOptions } from '../../../../../component-library/components-temp/HeaderCompactStandard';
import { styles } from './index.style';

export const QuoteSelectorView = () => {
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions(
      getHeaderCompactStandardNavbarOptions({
        title: strings('bridge.select_quote'),
        onBack: () => navigation.goBack(),
        includesTopInset: true,
      }),
    );
  }, [navigation]);

  return (
    <ScreenView>
      <Box>
        <View style={styles.infoContainer}>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('bridge.select_quote_info')}
          </Text>
        </View>
      </Box>
    </ScreenView>
  );
};
