import { StyleSheet } from 'react-native';
import { Theme } from '../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) => {
  const { theme } = params;
  const { colors } = theme;

  return StyleSheet.create({
    screen: {
      flex: 1,
      paddingHorizontal: 16,
      backgroundColor: colors.background.default,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 16,
      paddingBottom: 8,
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
    },
    headerButton: {
      width: 40,
    },
    content: {
      flex: 1,
      paddingTop: 16,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 24,
    },
    footer: {
      paddingVertical: 16,
    },

    // Loading
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 48,
    },
    loadingText: {
      marginTop: 16,
      textAlign: 'center',
    },

    // Merchant info
    merchantContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      paddingHorizontal: 60,
      marginBottom: 16,
    },
    merchantIcon: {
      width: 56,
      height: 56,
      borderRadius: 12,
      backgroundColor: colors.background.alternative,
    },
    merchantIconPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 12,
      backgroundColor: colors.background.alternative,
      justifyContent: 'center',
      alignItems: 'center',
    },
    merchantPayText: {
      textAlign: 'center',
    },

    // Confirm view - option cards
    optionsList: {
      marginTop: 16,
      flexGrow: 0,
    },
    optionsListContent: {
      gap: 8,
    },
    optionCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 12,
      backgroundColor: colors.background.alternative,
    },
    optionCardSelected: {
      backgroundColor: colors.primary.muted,
    },
    optionIconContainer: {
      width: 32,
      height: 32,
    },
    optionIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    optionChainIcon: {
      height: 18,
      width: 18,
      position: 'absolute',
      borderRadius: 9,
      borderWidth: 2,
      right: -3,
      bottom: -3,
    },
    optionTextContainer: {
      marginLeft: 8,
      flex: 1,
    },
    collectDataPill: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 999,
      backgroundColor: colors.warning.muted,
      marginLeft: 'auto',
    },

    // WebView (collectData)
    webViewContainer: {
      flex: 1,
    },
    webView: {
      flex: 1,
    },
    webViewLoadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1,
      backgroundColor: colors.background.default,
    },

    // Result view
    resultContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    resultIcon: {
      marginBottom: 12,
    },
    resultTitle: {
      textAlign: 'center',
      marginBottom: 8,
    },
    resultMessage: {
      textAlign: 'center',
      marginBottom: 24,
    },

    // Buttons
    primaryButton: {
      marginBottom: 12,
    },

    // Error banner
    errorBanner: {
      backgroundColor: colors.error.muted,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    errorText: {
      color: colors.error.default,
    },
  });
};

export default styleSheet;
