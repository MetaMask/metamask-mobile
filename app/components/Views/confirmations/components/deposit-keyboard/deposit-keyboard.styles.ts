import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';

const styleSheet = (params: { theme: Theme }) =>
  StyleSheet.create({
    skeletonButton: {
      width: '100%',
      height: 48,
      borderRadius: 10,
      flex: 1,
    },
    // Drawn above the hidden decimal-pad field, which is absolutely positioned
    // over this row. Without this the field takes the tap.
    controls: {
      zIndex: 1,
    },
    // iOS will not present the keyboard for a 0-size or fully transparent field.
    // It sits behind the percentage and Continue row.
    continueButton: {
      flex: 1,
    },
    // Draw over the neighboring dividers without resizing them.
    percentageButtonPressed: {
      zIndex: 1,
    },
    percentageDivider: {
      width: 0.5,
      height: 24,
      backgroundColor: params.theme.colors.border.muted,
    },
    // Keep the gap so the row does not reflow, and drop the stroke while
    // the wider pressed pill covers it.
    percentageDividerHidden: {
      opacity: 0,
    },
    nativeInput: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 48,
      opacity: 0.02,
    },
  });

export default styleSheet;
