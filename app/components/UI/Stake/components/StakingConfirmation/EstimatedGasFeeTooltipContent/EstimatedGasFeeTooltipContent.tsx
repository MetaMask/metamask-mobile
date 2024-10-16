import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { View, TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import Text, {
  TextVariant,
  TextColor,
} from '../../../../../../component-library/components/Texts/Text';
import AppConstants from '../../../../../../core/AppConstants';
import { useStyles } from '../../../../../hooks/useStyles';
import styleSheet from './EstimatedGasFeeTooltipContent.styles';

export const EstimatedGasFeeTooltipContent = () => {
  const { styles } = useStyles(styleSheet, {});

  const navigation = useNavigation();

  const handleNavigateToGasLearnMore = () =>
    navigation.navigate('Webview', {
      screen: 'SimpleWebview',
      params: {
        url: AppConstants.REVIEW_PROMPT.HIGH_GAS_FEES,
      },
    });

  return (
    <View style={styles.estimatedGasTooltipContent}>
      <Text>{strings('tooltip_modal.estimated_gas_fee.gas_recipient')}</Text>
      <Text>{strings('tooltip_modal.estimated_gas_fee.gas_fluctuation')}</Text>
      <TouchableOpacity
        activeOpacity={0.5}
        onPress={handleNavigateToGasLearnMore}
        style={styles.gasLearnMoreLink}
      >
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Primary}>
          {strings('tooltip_modal.estimated_gas_fee.gas_learn_more')}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

export default EstimatedGasFeeTooltipContent;
