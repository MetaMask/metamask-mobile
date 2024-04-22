/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';
import type { Theme } from '@metamask/design-tokens';
import Device from '../../../../util/device';
import scaling from '../../../../util/scaling';

const HEIGHT = scaling.scale(240);

export const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    wrapper: {
      flex: 1,
      alignItems: 'flex-start',
      backgroundColor: colors.background.default,
      paddingTop: 40,
      paddingHorizontal: 16,
    },
    card: {
      height: HEIGHT,
      width: Device.getDeviceWidth() - 32,
      alignSelf: 'center',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 16,
    },
    image: {
      resizeMode: 'cover',
      height: HEIGHT,
      width: Device.getDeviceWidth() - 32,
    },
    btnContainer: {
      bottom: 0,
      position: 'absolute',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignSelf: 'center',
      marginBottom: 16,
    },
    ctaBtn: {
      margin: 4,
      width: '48%',
      alignSelf: 'center',
    },
    textSpace: {
      marginBottom: 16,
    },
    textTitle: {
      marginBottom: 16,
      alignSelf: 'center',
    },
  });
