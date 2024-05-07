/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ImageBackground,
  Dimensions,
  Image,
} from 'react-native';
import { useTheme } from '../../../../../../util/theme';
const width_screen = Dimensions.get('window').width;
const card_item = width_screen - 24 * 2;

const card_size = {
  width: 325,
  height: 196,
};

const styleSheet = (colors: any) =>
  StyleSheet.create({
    card: {
      width: card_item,
      height: (card_item * card_size.height) / card_size.width,
      padding: 24,
    },
    cardNumber: {
      flex: 1,
      justifyContent: 'center',
    },
    cardNumberText: {
      color: colors.background.default,
      fontSize: 22,
      fontWeight: '600',
    },
    // eslint-disable-next-line react-native/no-color-literals
    cardHolderName: { color: 'rgba(255,255,255,0.4)' },
    cardName: { color: colors.background.default, fontSize: 14 },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  });

const Card = () => {
  const { colors } = useTheme();
  const styles = styleSheet(colors);

  return (
    <ImageBackground
      source={require('../assets/card_visa_bg.png')}
      style={styles.card}
    >
      <View style={styles.cardIcon}>
        <Image source={require('../assets/card_icon.png')} />
      </View>
      <View style={styles.cardNumber}>
        <Text style={styles.cardNumberText}>{`1234 5678 1234 5678`}</Text>
      </View>
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.cardHolderName}>Card holder</Text>
          <Text style={styles.cardName}>Jonathan Ferreira</Text>
        </View>
        <Image source={require('../assets/visa_text.png')} />
      </View>
    </ImageBackground>
  );
};

export default Card;
