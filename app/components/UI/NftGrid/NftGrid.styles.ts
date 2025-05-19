import { StyleSheet, Dimensions } from 'react-native';
import { Colors } from '../../../util/theme/models';

const DEVICE_WIDTH = Dimensions.get('window').width;
const GRID_PADDING = 10;
const NUM_COLUMNS = 3;
const ITEM_WIDTH =
  (DEVICE_WIDTH - GRID_PADDING * 2 * NUM_COLUMNS) / NUM_COLUMNS;
const ITEM_HEIGHT = ITEM_WIDTH + 60; // Width + space for text

const styleSheet = (colors: Colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    collectibleIcon: {
      width: ITEM_WIDTH,
      height: ITEM_WIDTH,
      borderRadius: 8,
    },
    collectibleCard: {
      width: ITEM_WIDTH,
      height: ITEM_HEIGHT,
      padding: GRID_PADDING,
      marginBottom: GRID_PADDING,
      justifyContent: 'flex-start',
      alignItems: 'center',
    },
    collectibleIconContainer: {
      width: ITEM_WIDTH,
      height: ITEM_WIDTH,
      marginBottom: 8,
      borderRadius: 8,
      overflow: 'hidden',
    },
    collectibleText: {
      width: '100%',
      textAlign: 'center',
    },
    footer: {
      display: 'flex',
      alignItems: 'center',
      marginBottom: 20,
    },
    spinner: {
      marginBottom: 8,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
    },
    emptyImageContainer: {
      width: 30,
      height: 30,
      tintColor: colors.background.default,
    },
    headingMd: {
      marginTop: 10,
    },
    emptyText: {
      color: colors.text.alternative,
      marginBottom: 8,
      fontSize: 14,
    },
  });

export default styleSheet;
