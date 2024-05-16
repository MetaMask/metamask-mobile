/* eslint-disable @typescript-eslint/no-require-imports */
import React, { useState } from 'react';
import { StyleSheet, Text, View, Dimensions, Image } from 'react-native';

import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  useDerivedValue,
} from 'react-native-reanimated';

import { TapGestureHandler, State } from 'react-native-gesture-handler';

import { useTheme } from '../../../../../../util/theme';
const width_screen = Dimensions.get('window').width;
const card_item = width_screen - 24 * 2;

const card_size = {
  width: 325,
  height: 196,
};

const styleSheet = (colors: any) =>
  StyleSheet.create({
    cardContainer: {
      width: card_item,
      height: (card_item * card_size.height) / card_size.width,
      padding: 24,
      backfaceVisibility: 'hidden',
      borderRadius: 24,
    },
    cardBackImage: {
      position: 'absolute',
      height: (card_item * card_size.height) / card_size.width,
      opacity: 0.9,
    },
    card: {
      position: 'absolute',
      width: card_item,
      overflow: 'hidden',
      borderRadius: 24,
    },
    cardIcon: {
      flexDirection: 'row',
      alignSelf: 'flex-start',
      justifyContent: 'center',
      maxWidth: 36,
      maxHeight: 36,
    },
    cardNumber: {
      flex: 1,
      justifyContent: 'center',
    },
    // eslint-disable-next-line react-native/no-color-literals
    cardBalanceText: {
      color: colors.background.default,
      alignSelf: 'center',
    },
    cardNumberText: {
      color: colors.background.default,
      fontSize: 22,
      fontWeight: '600',
    },
    // eslint-disable-next-line react-native/no-color-literals
    cardHolderName: { color: 'rgba(255,255,255,0.4)' },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    cardName: { color: colors.background.default, fontSize: 14 },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
  });

const Card = (balance: any) => {
  const { colors } = useTheme();
  const styles = styleSheet(colors);
  const [isFlipped, setIsFlipped] = useState(false);

  const rotation = useSharedValue(0);

  const toggleFlip = () => {
    rotation.value = withTiming(
      isFlipped ? 0 : 180,
      {
        duration: 500,
        easing: Easing.bezier(0.165, 0.84, 0.44, 1),
      },
      () => {
        runOnJS(setIsFlipped)(!isFlipped);
      },
    );
  };

  const frontCardStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotation.value}deg` }],
  }));

  const backCardStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${rotation.value + 180}deg` }],
    marginTop: 12,
  }));

  return (
    <>
      <TapGestureHandler
        onHandlerStateChange={(event) => {
          if (event.nativeEvent.state === State.END) {
            toggleFlip();
          }
        }}
      >
        <Animated.View style={[styles.cardContainer, frontCardStyle]}>
          <Image
            source={require('../assets/card_visa_bg.png')}
            style={styles.card}
          />
          <View style={styles.cardHeaderRow}>
            <Image
              source={require('../../../../../../images/fox.png')}
              style={styles.cardIcon}
            />
            <Text
              style={styles.cardBalanceText}
            >{`Balance: ${balance.balance}`}</Text>
          </View>
          <View style={styles.cardNumber}>
            <Text style={styles.cardNumberText}>{`1234 5678 1234 5678`}</Text>
          </View>
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.cardHolderName}>Card holder</Text>
              <Text style={styles.cardName}>Jonathan Ferreira</Text>
            </View>
          </View>
        </Animated.View>
      </TapGestureHandler>
      <TapGestureHandler
        onHandlerStateChange={(event) => {
          if (event.nativeEvent.state === State.END) {
            toggleFlip();
          }
        }}
      >
        <Animated.View
          style={[styles.cardContainer, backCardStyle, styles.card]}
        >
          <Image
            source={require('../../../../../../components/Base/NFT/NftBackground/foxRevamp.png')}
            style={styles.cardBackImage}
          />
        </Animated.View>
      </TapGestureHandler>
    </>
  );
};

export default Card;
