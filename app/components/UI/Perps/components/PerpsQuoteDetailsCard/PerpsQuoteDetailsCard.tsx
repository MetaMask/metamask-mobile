import React, { useCallback } from 'react';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { strings } from '../../../../../../locales/i18n';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import { Box } from '../../../Box/Box';
import Icon, {
  IconName,
  IconSize,
  IconColor,
} from '../../../../../component-library/components/Icons/Icon';
import KeyValueRow from '../../../../../component-library/components-temp/KeyValueRow';
import { TooltipSizes } from '../../../../../component-library/components-temp/KeyValueRow/KeyValueRow.types';
import { useStyles } from '../../../../../component-library/hooks';
import createStyles from './PerpsQuoteDetailsCard.styles';
import { selectSlippage } from '../../../../../core/redux/slices/bridge';
import Routes from '../../../../../constants/navigation/Routes';
import { FlexDirection, AlignItems } from '../../../Box/box.types';

interface PerpsQuoteDetailsCardProps {
  networkFee: string;
  estimatedTime?: string;
  rate: string;
  metamaskFee?: string;
}

const PerpsQuoteDetailsCard: React.FC<PerpsQuoteDetailsCardProps> = ({
  networkFee,
  estimatedTime,
  rate,
  metamaskFee = '$0.00',
}) => {
  const { styles } = useStyles(createStyles, {});
  const navigation = useNavigation();
  const slippage = useSelector(selectSlippage);

  const handleSlippagePress = useCallback(() => {
    navigation.navigate(Routes.BRIDGE.MODALS.ROOT, {
      screen: Routes.BRIDGE.MODALS.SLIPPAGE_MODAL,
    });
  }, [navigation]);

  const displaySlippage =
    slippage === undefined || slippage === null ? 'Auto' : `${slippage}%`;


  return (
    <Box style={styles.container}>
      <Box style={styles.quoteDetails}>
        <KeyValueRow
          field={{
            label: {
              text: strings('perps.deposit.network_fee'),
              variant: TextVariant.BodyMDMedium,
            },
          }}
          value={{
            label: {
              text: networkFee,
              variant: TextVariant.BodyMD,
            },
          }}
          style={styles.quoteRow}
        />

        <KeyValueRow
          field={{
            label: {
              text: strings('perps.deposit.metamask_fee'),
              variant: TextVariant.BodyMDMedium,
            },
            tooltip: {
              title: strings('perps.deposit.metamask_fee'),
              content: strings('perps.deposit.metamask_fee_tooltip'),
              size: TooltipSizes.Sm,
            },
          }}
          value={{
            label: {
              text: metamaskFee,
              variant: TextVariant.BodyMD,
            },
          }}
          style={styles.quoteRow}
        />

        {estimatedTime && (
          <KeyValueRow
            field={{
              label: {
                text: strings('perps.deposit.estimated_time'),
                variant: TextVariant.BodyMDMedium,
              },
            }}
            value={{
              label: {
                text: estimatedTime,
                variant: TextVariant.BodyMD,
              },
            }}
            style={styles.quoteRow}
          />
        )}

        <KeyValueRow
          field={{
            label: {
              text: strings('perps.deposit.rate'),
              variant: TextVariant.BodyMDMedium,
            },
          }}
          value={{
            label: {
              text: rate,
              variant: TextVariant.BodyMD,
            },
          }}
          style={styles.quoteRow}
        />

        <KeyValueRow
          field={{
            label: (
              <Box
                flexDirection={FlexDirection.Row}
                alignItems={AlignItems.center}
                gap={4}
              >
                <TouchableOpacity
                  onPress={handleSlippagePress}
                  activeOpacity={0.6}
                  testID="edit-slippage-button"
                  style={styles.slippageButton}
                >
                  <Text variant={TextVariant.BodyMDMedium}>
                    {strings('perps.deposit.slippage')}
                  </Text>
                  <Icon
                    name={IconName.Edit}
                    size={IconSize.Sm}
                    color={IconColor.Muted}
                  />
                </TouchableOpacity>
              </Box>
            ),
          }}
          value={{
            label: {
              text: displaySlippage,
              variant: TextVariant.BodyMD,
            },
          }}
          style={styles.quoteRow}
        />
      </Box>
    </Box>
  );
};

export default PerpsQuoteDetailsCard;
