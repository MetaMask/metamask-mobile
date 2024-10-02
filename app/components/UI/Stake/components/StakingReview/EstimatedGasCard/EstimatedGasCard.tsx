import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import KeyValueRow, {
  TooltipSizes,
} from '../../../../../../component-library/components-temp/KeyValueRow';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import Card from '../../../../../../component-library/components/Cards/Card';
import { useStyles } from '../../../../../hooks/useStyles';
import useTooltipModal from '../../../../../hooks/useTooltipModal';
import styleSheet from './EstimatedGasCard.styles';
import { EstimatedGasCardProps } from './EstimatedGasCard.types';
import EstimatedGasFeeTooltipContent from '../EstimatedGasFeeTooltipContent/EstimatedGasFeeTooltipContent';

const EstimatedGasCard = ({
  gasCostEth,
  gasCostFiat,
}: EstimatedGasCardProps) => {
  const { styles } = useStyles(styleSheet, {});

  const { openTooltipModal } = useTooltipModal();

  const handleNavigateToEditGas = () =>
    openTooltipModal('TODO', 'Navigate to gas customization component');

  return (
    <Card style={styles.estGasFeeCard} disabled>
      <KeyValueRow
        field={{
          label: { text: strings('tooltip_modal.estimated_gas_fee.title') },
          tooltip: {
            title: strings('tooltip_modal.estimated_gas_fee.title'),
            text: <EstimatedGasFeeTooltipContent />,
            size: TooltipSizes.Sm,
          },
        }}
        value={{
          label: (
            <View style={styles.estGasFeeValue}>
              <Text style={styles.foxIcon}>🦊</Text>
              <Text style={styles.fiatText} color={TextColor.Alternative}>
                {gasCostFiat}
              </Text>
              <TouchableOpacity
                activeOpacity={0.5}
                onPress={handleNavigateToEditGas}
              >
                <View style={styles.ethText}>
                  <Text
                    variant={TextVariant.BodyMDMedium}
                    color={TextColor.Primary}
                  >
                    {gasCostEth}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          ),
        }}
      />
    </Card>
  );
};

export default EstimatedGasCard;
