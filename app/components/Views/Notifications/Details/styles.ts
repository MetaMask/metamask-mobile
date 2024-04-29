/* eslint-disable import/prefer-default-export */
import { StyleSheet } from 'react-native';
import type { Theme } from '@metamask/design-tokens';
import Device from '../../../../util/device';
import { fontStyles } from '../../../../styles/common';
import scaling from '../../../../util/scaling';

const HEIGHT = scaling.scale(240);
const DEVICE_WIDTH = Device.getDeviceWidth();
const COLLECTIBLE_WIDTH = (DEVICE_WIDTH - 30 - 16) / 3;

export const createStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    contentContainerWrapper: {
      flex: 1,
      alignItems: 'flex-start',
      backgroundColor: colors.background.default,
      paddingTop: 16,
    },
    headerTitle: { alignItems: 'center', top: 4 },
    row: {
      flexDirection: 'row',
      justifyContent: 'flex-start',
      minWidth: '100%',
      paddingVertical: 8,
      paddingHorizontal: 16,
    },
    badgeWrapper: {
      marginRight: 16,
    },
    nftBadgeWrapper: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 12,
      height: 12,
      borderRadius: 6,
    },
    copyIconDefault: {
      color: colors.text.alternative,
      marginHorizontal: 8,
    },
    boxLeft: { alignSelf: 'flex-start' },
    boxRight: { marginLeft: 'auto' },
    text: {
      marginBottom: 8,
      paddingHorizontal: 32,
      textAlign: 'center',
    },
    descriptionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    addressLinkLabel: {
      ...(fontStyles.normal as any),
      color: colors.text.alternative,
    },
    icon: { marginHorizontal: 20 },
    touchableViewOnEtherscan: {
      marginBottom: 24,
      marginTop: 12,
    },
    viewOnEtherscan: {
      fontSize: 16,
      color: colors.primary.default,
      ...fontStyles.normal,
      textAlign: 'center',
    },
    renderFCMContainer: {
      alignItems: 'flex-start',
      flex: 1,
    },
    renderFCMText: {
      textAlign: 'left',
    },
    renderFCMCard: {
      height: HEIGHT,
      width: Device.getDeviceWidth() - 32,
      alignContent: 'center',
      borderRadius: 12,
      overflow: 'hidden',
      marginBottom: 16,
    },
    FCMImage: {
      resizeMode: 'cover',
      height: HEIGHT,
      width: Device.getDeviceWidth() - 32,
    },
    renderTxContainer: {
      alignSelf: 'center',
    },
    renderTxNFT: {
      height: COLLECTIBLE_WIDTH,
      width: COLLECTIBLE_WIDTH,
      alignContent: 'center',
      borderRadius: 4,
      overflow: 'hidden',
    },
    ctaBtn: {
      bottom: 0,
      position: 'absolute',
      width: '90%',
      alignSelf: 'center',
      margin: 16,
      backgroundColor: colors.background.default,
    },
    rightSection: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      marginLeft: 'auto',
    },
    copyTextBtn: {
      color: colors.primary.default,
      alignSelf: 'flex-start',
    },
    copyIconRight: {
      marginLeft: 8,
    },
    ethLogo: {
      width: 30,
      height: 30,
    },
    gasDetails: {
      marginBottom: 80,
    },
    nftPlaceholder: { backgroundColor: colors.background.alternative },
    header: { alignItems: 'center', marginTop: 4 },
  });
