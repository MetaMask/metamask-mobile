import React, {
  PropsWithChildren,
  useCallback,
  useEffect,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import {
  ImageSourcePropType,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';

import RemoteImage from '../RemoteImage';
import Text from '../../../../app/component-library/components/Texts/Text/Text.tsx';
import { useTheme } from '../../../util/theme';
import imageIcons from '../../../images/image-icons';
import ethLogo from '../../../images/eth-logo-new.png';
import { ThemeColors } from '@metamask/design-tokens';

const REGULAR_SIZE = 24;
const REGULAR_RADIUS = 12;
const MEDIUM_SIZE = 36;
const MEDIUM_RADIUS = 18;
const BIG_SIZE = 50;
const BIG_RADIUS = 25;
const BIGGEST_SIZE = 70;
const BIGGEST_RADIUS = 35;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    icon: {
      width: REGULAR_SIZE,
      height: REGULAR_SIZE,
      borderRadius: REGULAR_RADIUS,
    },
    iconMedium: {
      width: MEDIUM_SIZE,
      height: MEDIUM_SIZE,
      borderRadius: MEDIUM_RADIUS,
    },
    iconBig: {
      width: BIG_SIZE,
      height: BIG_SIZE,
      borderRadius: BIG_RADIUS,
    },
    iconBiggest: {
      width: BIGGEST_SIZE,
      height: BIGGEST_SIZE,
      borderRadius: BIGGEST_RADIUS,
    },
    emptyIcon: {
      backgroundColor: colors.background.alternative,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tokenSymbol: {
      fontSize: 16,
      textAlign: 'center',
      textAlignVertical: 'center',
      color: colors.text.default,
    },
    tokenSymbolMedium: {
      fontSize: 22,
      color: colors.text.default,
    },
    tokenSymbolBig: {
      fontSize: 26,
      color: colors.text.default,
    },
    tokenSymbolBiggest: {},
  });

interface EmptyIconProps {
  medium?: boolean;
  big?: boolean;
  biggest?: boolean;
  style?: ViewStyle;
}

const EmptyIcon = ({
  medium,
  big,
  biggest,
  style,
  ...props
}: PropsWithChildren<EmptyIconProps>) => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View
      style={[
        styles.icon,
        medium && styles.iconMedium,
        big && styles.iconBig,
        biggest && styles.iconBiggest,
        styles.emptyIcon,
        style,
      ]}
      {...props}
    />
  );
};

EmptyIcon.propTypes = {
  medium: PropTypes.bool,
  big: PropTypes.bool,
  biggest: PropTypes.bool,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  testID: PropTypes.string,
};

interface TokenIconProps extends EmptyIconProps {
  symbol?: string;
  icon?: string;
  emptyIconTextStyle?: TextStyle;
  testID?: string;
}

function TokenIcon({
  symbol,
  icon,
  medium,
  big,
  biggest,
  style,
  emptyIconTextStyle,
  testID,
}: Readonly<TokenIconProps>) {
  const [showFallback, setShowFallback] = useState(false);
  const { colors } = useTheme();
  const styles = createStyles(colors);

  // Reset fallback state when icon or symbol changes
  useEffect(() => {
    setShowFallback(false);
  }, [icon, symbol]);

  const getSource = useCallback(() => {
    if (symbol === 'ETH') {
      return ethLogo;
    }

    if (symbol === 'SOL') {
      return imageIcons.SOLANA;
    }

    if (symbol && Object.keys(imageIcons).includes(symbol)) {
      const imageIcon = imageIcons[symbol as keyof typeof imageIcons];
      // Skip SVG components (functions) and strings, only return valid image sources
      if (typeof imageIcon !== 'function' && typeof imageIcon !== 'string') {
        return imageIcon as ImageSourcePropType;
      }
    }

    if (icon) {
      return { uri: icon };
    }

    return undefined;
  }, [symbol, icon]);

  const source = getSource();

  if (source && !showFallback) {
    return (
      <RemoteImage
        key={icon || `symbol-${symbol}`}
        testID={testID}
        fadeIn
        source={getSource()}
        onError={() => setShowFallback(true)}
        style={[
          styles.icon,
          medium && styles.iconMedium,
          big && styles.iconBig,
          biggest && styles.iconBiggest,
          style,
        ]}
      />
    );
  }

  if (symbol) {
    return (
      <EmptyIcon
        medium={medium}
        big={big}
        biggest={biggest}
        style={style}
        testID={testID}
      >
        <Text
          style={[
            styles.tokenSymbol,
            medium && styles.tokenSymbolMedium,
            (big || biggest) && styles.tokenSymbolBig,
            biggest && styles.tokenSymbolBiggest,
            emptyIconTextStyle,
          ]}
        >
          {symbol[0].toUpperCase()}
        </Text>
      </EmptyIcon>
    );
  }

  return <EmptyIcon medium={medium} style={style} />;
}

TokenIcon.propTypes = {
  symbol: PropTypes.string,
  icon: PropTypes.string,
  medium: PropTypes.bool,
  big: PropTypes.bool,
  biggest: PropTypes.bool,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  emptyIconTextStyle: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  testID: PropTypes.string,
};

export default TokenIcon;
