import { StyleSheet } from 'react-native';
import type { Theme } from '@metamask/design-tokens';
import Device from '../../../../util/device';
import { fontStyles } from '../../../../styles/common';
import scaling from '../../../../util/scaling';

const HEIGHT = scaling.scale(240);
const DEVICE_WIDTH = Device.getDeviceWidth();
const COLLECTIBLE_WIDTH = (DEVICE_WIDTH - 30 - 16) / 3;

export type NotificationDetailStyles = ReturnType<typeof createStyles>;

export const createStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    contentContainerWrapper: {
      flex: 1,
      alignItems: 'flex-start',
      backgroundColor: colors.background.default,
      paddingTop: 16,
    },
    headerImageContainer: {
      paddingBottom: 16,
      alignSelf: 'center',
    },
    headerImageFull: {
      width: '100%',
      aspectRatio: '4/3', // Landscape aspect ratio
      borderRadius: 8,
    },
    headerImageFullPlaceholder: {
      width: '100%',
      backgroundColor: colors.background.alternative,
    },
    fieldsContainer: {
      gap: 4,
    },
    row: {
      flexDirection: 'row',
      minWidth: '100%',
      paddingVertical: 5,
      gap: 16,
    },
    badgeWrapper: {
      alignSelf: 'center',
    },
    customBadgePosition: {
      top: '-25%',
      right: '-25%',
    },
    copyContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    copyIconDefault: {
      color: colors.icon.alternative,
    },
    boxLeft: {
      flex: 1,
      flexDirection: 'column',
    },
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
      ...fontStyles.normal,
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
    renderContainer: {
      alignItems: 'flex-start',
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16,
      width: '100%',
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
      backgroundColor: colors.background.alternative,
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
      alignSelf: 'center',
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
      flex: 1,
      alignSelf: 'flex-start',
      alignItems: 'flex-end',
      flexDirection: 'column',
    },
    copyTextBtn: {
      color: colors.primary.default,
    },
    ethLogo: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    gasDetails: {
      marginBottom: 80,
      paddingHorizontal: 16,
    },
    squareLogoLarge: {
      width: 96,
      height: 96,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 0.5,
      borderColor: colors.background.alternative,
    },
    squareLogoLargePlaceholder: {
      backgroundColor: colors.background.alternative,
      width: 96,
      height: 96,
      borderRadius: 8,
      borderWidth: 0.5,
      borderColor: colors.background.alternative,
    },
    squareLogo: {
      width: 32,
      height: 32,
      borderRadius: 8,
      overflow: 'hidden',
      borderWidth: 0.5,
      borderColor: colors.background.alternative,
    },
    squareLogoPlaceholder: {
      backgroundColor: colors.background.alternative,
      width: 32,
      height: 32,
      borderRadius: 8,
      borderWidth: 0.5,
      borderColor: colors.background.alternative,
    },
    circleLogo: {
      width: 32,
      height: 32,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 0.5,
      borderColor: colors.background.alternative,
    },
    circleLogoPlaceholder: {
      backgroundColor: colors.background.alternative,
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 0.5,
      borderColor: colors.background.alternative,
    },
    foxWrapper: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.background.alternative,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
      position: 'absolute',
      top: '25%',
    },
    header: {
      flexDirection: 'row',
      marginTop: 4,
      flexWrap: 'wrap',
    },
    headerText: {
      width: Device.isAndroid() ? '80%' : '100%',
      textAlign: 'center',
    },
    announcementDescriptionText: {
      ...typography.sBodyMD,
      color: colors.text.default,
      marginHorizontal: 1,
      // Announcement Description has some underlying padding that we want to remove.
      marginTop: -16,
      textAlign: 'justify',
    },
    backIcon: {
      marginLeft: 16,
    },
  });
