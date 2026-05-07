import { StyleSheet } from 'react-native';
import type { Colors } from '../../../../../util/theme/models';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 32,
    },
    cardsStack: {
      gap: 8,
      marginBottom: 24,
    },
    notifCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: colors.background.alternative,
      borderRadius: 14,
      padding: 12,
    },
    notifCardFaded: {
      // Opacity fade is handled by the LinearGradient mask overlay
    },
    foxTile: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.background.default,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    foxImage: {
      width: 22,
      height: 22,
    },
    notifTextBlock: {
      flex: 1,
      minWidth: 0,
    },
    notifHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 3,
    },
    notifEyebrow: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text.alternative,
      letterSpacing: 0.3,
    },
    notifTimestamp: {
      fontSize: 12,
      fontWeight: '400',
      color: colors.text.alternative,
    },
    notifTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text.default,
      lineHeight: 18,
    },
    notifMessage: {
      fontSize: 13,
      fontWeight: '400',
      color: colors.text.default,
      marginTop: 2,
      lineHeight: 18,
    },
    // Second card fade wrapper — wraps the full card
    fadedCardWrapper: {
      position: 'relative',
    },
    title: {
      fontSize: 20,
      fontWeight: '600',
      textAlign: 'center',
      color: colors.text.default,
      marginBottom: 12,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      textAlign: 'center',
      color: colors.text.alternative,
      marginBottom: 24,
    },
    buttonsContainer: {
      gap: 12,
    },
    button: {
      borderRadius: 12,
    },
    fadeMask: {
      flex: 1,
    },
  });

export default createStyles;
