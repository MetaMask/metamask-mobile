import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { StyleSheet, TouchableOpacity } from 'react-native';
import FA5Icon from 'react-native-vector-icons/FontAwesome5';
import { useRatio } from '../utils';
import Text from '../../../Base/Text';
import { useTheme } from '../../../../util/theme';

const createStyles = (colors) =>
  StyleSheet.create({
    infoIcon: {
      fontSize: 12,
      margin: 3,
      color: colors.primary.default,
    },
  });
function Ratio({
  sourceAmount,
  sourceToken,
  destinationAmount,
  destinationToken,
  boldSymbol = false,
}) {
  /* Get the ratio between the assets given the selected quote*/
  const [ratioAsSource, setRatioAsSource] = useState(true);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const [numerator, denominator] = useMemo(() => {
    const source = { ...sourceToken, amount: sourceAmount };
    const destination = { ...destinationToken, amount: destinationAmount };

    return ratioAsSource ? [destination, source] : [source, destination];
  }, [
    destinationAmount,
    destinationToken,
    ratioAsSource,
    sourceAmount,
    sourceToken,
  ]);

  const ratio = useRatio(
    numerator?.amount,
    numerator?.decimals,
    denominator?.amount,
    denominator?.decimals,
  );

  const handleRatioSwitch = () => setRatioAsSource((isSource) => !isSource);

  return (
    <TouchableOpacity onPress={handleRatioSwitch}>
      <Text primary={boldSymbol}>
        1{' '}
        <Text reset bold={boldSymbol}>
          {denominator?.symbol}
        </Text>{' '}
        = {ratio.toFormat(10)}{' '}
        <Text reset bold={boldSymbol}>
          {numerator?.symbol}
        </Text>{' '}
        <FA5Icon name="sync" style={styles.infoIcon} />
      </Text>
    </TouchableOpacity>
  );
}

Ratio.propTypes = {
  sourceAmount: PropTypes.string,
  sourceToken: PropTypes.shape({
    symbol: PropTypes.string,
    decimals: PropTypes.number,
  }),
  destinationAmount: PropTypes.string,
  destinationToken: PropTypes.shape({
    symbol: PropTypes.string,
    decimals: PropTypes.number,
  }),
  boldSymbol: PropTypes.bool,
};

export default Ratio;
