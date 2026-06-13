/* eslint-disable react/prop-types */
import React from 'react';
import { StyleSheet, ViewProps } from 'react-native';
import { BigNumber } from 'bignumber.js';
import { useStyles } from '../../../hooks/useStyles';
import { strings } from '../../../../../locales/i18n';
import useFiatFormatter from './useFiatFormatter';
import { FIAT_UNAVAILABLE, FiatAmount } from '../types';
import useHideFiatForTestnet from '../../../hooks/useHideFiatForTestnet';
import { shortenString } from '../../../../util/notifications';
import {
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';

const styleSheet = () =>
  StyleSheet.create({
    base: {
      paddingRight: 2,
      textAlign: 'right',
    },
  });

const sharedTextProps = {
  color: TextColor.TextAlternative,
  variant: TextVariant.BodyMd,
} as const;

export function calculateTotalFiat(fiatAmounts: FiatAmount[]): BigNumber {
  return fiatAmounts.reduce(
    (total: BigNumber, fiat) =>
      total.plus(
        fiat === FIAT_UNAVAILABLE ? new BigNumber(0) : new BigNumber(fiat),
      ),
    new BigNumber(0),
  );
}

/**
 * Displays the fiat value of a single balance change.
 *
 * @param props - Properties object.
 * @param props.fiatAmount - The fiat amount to display.
 */

interface IndividualFiatDisplayProps extends ViewProps {
  fiatAmount: BigNumber | FiatAmount;
  shorten?: boolean;
}

export const IndividualFiatDisplay: React.FC<IndividualFiatDisplayProps> = ({
  fiatAmount,
  shorten = true,
}) => {
  const hideFiatForTestnet = useHideFiatForTestnet();
  const { styles } = useStyles(styleSheet, {});
  const fiatFormatter = useFiatFormatter();

  if (hideFiatForTestnet) {
    return null;
  }

  if (fiatAmount === FIAT_UNAVAILABLE) {
    return null;
  }
  const absFiat = new BigNumber(fiatAmount).abs();

  const absFiatFormatted = shorten
    ? shortenString(fiatFormatter(absFiat), {
        truncatedCharLimit: 15,
        truncatedStartChars: 15,
        truncatedEndChars: 0,
        skipCharacterInEnd: true,
      })
    : fiatFormatter(absFiat);

  return (
    <Text {...sharedTextProps} style={styles.base} variant={TextVariant.BodySm}>
      {absFiatFormatted}
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

  if (totalFiat === null || totalFiat.eq(0)) {
    return null;
  }

  return (
    <Text {...sharedTextProps} variant={TextVariant.BodySm} style={styles.base}>
      {strings('simulation_details.total_fiat', {
        currency: fiatFormatter(totalFiat.abs()),
      })}
    </Text>
  );
};
