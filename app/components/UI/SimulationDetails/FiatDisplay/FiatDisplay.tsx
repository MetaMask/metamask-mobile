/* eslint-disable react/prop-types */
import React from 'react';
import { StyleSheet } from 'react-native';
import { useStyles } from '../../../hooks/useStyles';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';
import { strings } from '../../../../../locales/i18n';
import useFiatFormatter from './useFiatFormatter';
import { FIAT_UNAVAILABLE, FiatAmount } from '../types';
import useHideFiatForTestnet from '../../../hooks/useHideFiatForTestnet';

const styleSheet = () =>
  StyleSheet.create({
    base: {
      paddingRight: 2,
      textAlign: 'right',
    },
  });

const sharedTextProps = {
  color: TextColor.Alternative,
  variant: TextVariant.BodyMD,
} as const;

const FiatNotAvailableDisplay: React.FC = () => {
  const { styles } = useStyles(styleSheet, {});
  return (
    <Text {...sharedTextProps} style={styles.base}>
      {strings('simulation_details.fiat_not_available')}
    </Text>
  );
};

export function calculateTotalFiat(fiatAmounts: FiatAmount[]): number {
  return fiatAmounts.reduce(
    (total: number, fiat) => total + (fiat === FIAT_UNAVAILABLE ? 0 : fiat),
    0,
  );
}

/**
 * Displays the fiat value of a single balance change.
 *
 * @param props - Properties object.
 * @param props.fiatAmount - The fiat amount to display.
 */
export const IndividualFiatDisplay: React.FC<{ fiatAmount: FiatAmount }> = ({
  fiatAmount,
}) => {
  const hideFiatForTestnet = useHideFiatForTestnet();
  const { styles } = useStyles(styleSheet, {});
  const fiatFormatter = useFiatFormatter();

  if (hideFiatForTestnet) {
    return null;
  }

  if (fiatAmount === FIAT_UNAVAILABLE) {
    return <FiatNotAvailableDisplay />;
  }
  const absFiat = Math.abs(fiatAmount);

  return (
    <Text {...sharedTextProps} style={styles.base}>
      {fiatFormatter(absFiat)}
    </Text>
  );
};

/**
 * Displays the total fiat value of a list of balance changes.
 *
 * @param props - Properties object.
 * @param props.fiatAmounts - The list of fiat amounts to sum.
 */
export const TotalFiatDisplay: React.FC<{
  fiatAmounts: FiatAmount[];
}> = ({ fiatAmounts }) => {
  const hideFiatForTestnet = useHideFiatForTestnet();
  const { styles } = useStyles(styleSheet, {});
  const fiatFormatter = useFiatFormatter();
  const totalFiat = calculateTotalFiat(fiatAmounts);

  if (hideFiatForTestnet) {
    return null;
  }

  return totalFiat === 0 ? (
    <FiatNotAvailableDisplay />
  ) : (
    <Text {...sharedTextProps} style={styles.base}>
      {strings('simulation_details.total_fiat', {
        currency: fiatFormatter(Math.abs(totalFiat)),
      })}
    </Text>
  );
};
