import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BaseTitle from '../../../Base/Title';
import { useTheme } from '../../../../util/theme';
import BaseText from '../../../Base/Text';
import StyledButton from '../../StyledButton';
import { strings } from '../../../../../locales/i18n';
import { Colors } from '../../../../util/theme/models';

// TODO: Convert into typescript and correctly type
const Text = BaseText as any;
const Title = BaseTitle as any;

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background.default,
    },
    content: {
      width: '100%',
      paddingHorizontal: 60,
      marginTop: -100,
    },
    ctaContainer: {
      marginTop: 30,
    },
    row: {
      marginVertical: 1,
    },
    errorIcon: {
      color: colors.error.default,
      fontSize: 38,
      marginVertical: 4,
      textAlign: 'center',
    },
  });

interface Props {
  description: string; // The error description (Required)
  title?: string; //  The error title, default will be "Error" if not provided (Optional)
  ctaLabel?: string; // The CTA button label, default will be "Try again" (Optional)
  ctaOnPress?: () => any; // The optional callback to be invoked when pressing the CTA button (Optional)
}

function ErrorView({ description, title, ctaLabel, ctaOnPress }: Props) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const ctaOnPressCallback = useCallback(() => {
    ctaOnPress?.();
  }, [ctaOnPress]);

  return (
    <View style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.row}>
          <MaterialCommunityIcons
            name="close-circle-outline"
            style={styles.errorIcon}
          />
        </View>

        <View style={styles.row}>
          <Title centered>
            {title || strings('fiat_on_ramp_aggregator.error')}
          </Title>
        </View>

        <View style={styles.row}>
          <Text centered grey>
            {description}
          </Text>
        </View>

        {ctaOnPress && (
          <View style={styles.ctaContainer}>
            <StyledButton type="confirm" onPress={ctaOnPressCallback}>
              {ctaLabel || strings('fiat_on_ramp_aggregator.try_again')}
            </StyledButton>
          </View>
        )}
      </View>
    </View>
  );
}

export default ErrorView;
