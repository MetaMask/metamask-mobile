import React from 'react';
import { strings } from '../../../../../../locales/i18n';
import { Box } from '../../../Box/Box';
import KeyValueRow from '../../../../../component-library/components-temp/KeyValueRow';
import { TooltipSizes } from '../../../../../component-library/components-temp/KeyValueRow/KeyValueRow.types';
import { useStyles } from '../../../../../component-library/hooks';
import createStyles from './PerpsQuoteDetailsCard.styles';
import { FontWeight } from '@metamask/design-system-react-native';

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
    <Box style={styles.container}>
      <Box style={styles.quoteDetails}>
        <KeyValueRow
          field={{
            label: {
              text: strings('perps.quote.network_fee'),
              fontWeight: FontWeight.Medium,
            },
          }}
          value={{
            label: {
              text: networkFee,
            },
          }}
          style={styles.quoteRow}
        />

        <KeyValueRow
          field={{
            label: {
              text: strings('perps.quote.metamask_fee'),
              fontWeight: FontWeight.Medium,
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
            },
          }}
          style={styles.quoteRow}
        />

        {estimatedTime && (
          <KeyValueRow
            field={{
              label: {
                text: strings('perps.quote.estimated_time'),
                fontWeight: FontWeight.Medium,
              },
            }}
            value={{
              label: {
                text: estimatedTime,
              },
            }}
            style={styles.quoteRow}
          />
        )}

        <KeyValueRow
          field={{
            label: {
              text: strings('perps.quote.rate'),
              fontWeight: FontWeight.Medium,
            },
          }}
          value={{
            label: {
              text: rate,
            },
          }}
          style={styles.quoteRow}
        />
      </Box>
    </Box>
  );
};

export default PerpsQuoteDetailsCard;
