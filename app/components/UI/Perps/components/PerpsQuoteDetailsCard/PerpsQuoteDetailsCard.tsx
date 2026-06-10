import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { TextVariant as LegacyTextVariant } from '../../../../../component-library/components/Texts/Text';
import { Box } from '../../../Box/Box';
import KeyValueRow from '../../../../../component-library/components-temp/KeyValueRow';
import { TooltipSizes } from '../../../../../component-library/components-temp/KeyValueRow/KeyValueRow.types';
import { useStyles } from '../../../../../component-library/hooks';
import createStyles from './PerpsQuoteDetailsCard.styles';

export type QuoteDirection = 'deposit' | 'withdrawal';

interface PerpsQuoteDetailsCardProps {
  networkFee: string;
  estimatedTime?: string;
  rate: string;
  metamaskFee?: string;
  direction?: QuoteDirection;
}

const PerpsQuoteDetailsCard: React.FC<PerpsQuoteDetailsCardProps> = ({
  networkFee,
  estimatedTime,
  rate,
  metamaskFee = '$0.00',
  direction = 'deposit',
}) => {
  const { styles } = useStyles(createStyles, {});

  return (
    <Box style={[styles.container, styles.quoteDetails]}>
      <KeyValueRow
        field={{
          label: {
            text: strings('perps.quote.network_fee'),
            variant: LegacyTextVariant.BodyMDMedium,
          },
        }}
        value={{
          label: {
            text: networkFee,
            variant: LegacyTextVariant.BodyMD,
          },
        }}
        style={styles.quoteRow}
      />

      <KeyValueRow
        field={{
          label: {
            text: strings('perps.quote.metamask_fee'),
            variant: LegacyTextVariant.BodyMDMedium,
          },
          tooltip: {
            title: strings('perps.quote.metamask_fee'),
            content: strings(`perps.quote.metamask_fee_tooltip_${direction}`),
            size: TooltipSizes.Sm,
          },
        }}
        value={{
          label: {
            text: metamaskFee,
            variant: LegacyTextVariant.BodyMD,
          },
        }}
        style={styles.quoteRow}
      />

      {estimatedTime && (
        <KeyValueRow
          field={{
            label: {
              text: strings('perps.quote.estimated_time'),
              variant: LegacyTextVariant.BodyMDMedium,
            },
          }}
          value={{
            label: {
              text: estimatedTime,
              variant: LegacyTextVariant.BodyMD,
            },
          }}
          style={styles.quoteRow}
        />
      )}

      <KeyValueRow
        field={{
          label: {
            text: strings('perps.quote.rate'),
            variant: LegacyTextVariant.BodyMDMedium,
          },
        }}
        value={{
          label: {
            text: rate,
            variant: LegacyTextVariant.BodyMD,
          },
        }}
        style={styles.quoteRow}
      />
    </Box>
  );
};

export default PerpsQuoteDetailsCard;
