import { StyleSheet, Dimensions, Platform } from 'react-native';
import { fontStyles } from '../../../styles/common';

const { height } = Dimensions.get('window');

// TODO: Replace "any" with type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    mainWrapper: {
      backgroundColor: colors.background.default,
      flex: 1,
    },
    wrapper: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
      height: '100%',
      rowGap: 16,
    },
    selectedWord: {
      backgroundColor: colors.background.alternative,
      borderWidth: 0,
    },
    selectedWordText: {
      color: colors.text.default,
    },
    seedPhraseContainer: {
      backgroundColor: colors.background.muted,
      borderRadius: 10,
      height: 'auto',
      flexDirection: 'column',
      marginBottom: 16,
      padding: 16,
      gap: 4,
    },
    statusContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'column',
      gap: 16,
      padding: 16,
      width: '100%',
    },
    emptySlot: {
      backgroundColor: colors.background.default,
      opacity: 1,
      borderColor: colors.border.default,
      borderWidth: 2,
    },
    selectedSlotBox: {
      borderColor: colors.primary.default,
      borderWidth: 2,
    },
    missingWords: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
    },
    missingWord: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      margin: 8,
      borderRadius: 8,
      backgroundColor: colors.background.default,
      borderWidth: 1,
      borderColor: colors.primary.default,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      height: 40,
      color: colors.primary.default,
    },
    missingWordText: {
      color: colors.primary.default,
    },
    missingWordTextSelected: {
      color: colors.text.default,
    },
    gridItem: {
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: 8,
      backgroundColor: colors.background.default,
      borderWidth: 1,
      borderColor: colors.border.muted,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: Platform.select({
        ios: 4,
        macos: 4,
        default: 3,
      }),
      height: 40,
      fontSize: 14,
      color: colors.text.default,
      ...fontStyles.normal,
      opacity: 0.5,
      margin: Platform.select({
        ios: 4,
        macos: 4,
        default: 3,
      }),
    },
    gridContainer: {
      flex: 1,
      flexDirection: 'column',
      gap: 4,
    },
    gridItemIndex: {
      color: colors.text.alternative,
      ...fontStyles.normal,
      fontSize: 14,
    },
    gridItemText: {
      width: '95%',
    },
    content: {
      flex: 1,
      flexDirection: 'column',
      justifyContent: 'space-between',
      rowGap: 16,
      height: height - 290,
    },
    headerLeft: {
      marginLeft: 16,
    },
    statusButton: {
      width: '100%',
    },
    statusDescription: {
      textAlign: 'left',
      alignSelf: 'flex-start',
      width: '100%',
    },
    actionView: {
      flex: 1,
    },
    buttonContainer: {
      paddingHorizontal: 0,
      marginBottom: Platform.OS === 'android' ? 16 : 0,
    },
  });

export default createStyles;
