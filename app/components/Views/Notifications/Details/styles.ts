import { Platform, StyleSheet } from 'react-native';
import type { Theme } from '@metamask/design-tokens';
import { fontStyles } from '../../../../styles/common';
import {
  getFontFamily,
  TextVariant,
} from '../../../../component-library/components/Texts/Text';

export type NotificationDetailStyles = ReturnType<typeof createStyles>;

export const createStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    scrollContainer: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 16,
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
    addressLinkLabel: {
      ...fontStyles.normal,
      color: colors.text.alternative,
    },
    footerContainer: {
      marginTop: 'auto',
      paddingTop: 24,
      marginBottom: Platform.OS === 'android' ? 0 : 16,
    },
    ctaBtn: {
      width: '100%',
      alignSelf: 'center',
      margin: 16,
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
    modalContainer: {
      flex: 1,
    },
    navContainer: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 16,
    },
    header: {
      paddingInline: 4,
      flex: 1,
    },
    announcementDescriptionText: {
      ...typography.sBodyMD,
      fontFamily: getFontFamily(TextVariant.BodyMD),
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
