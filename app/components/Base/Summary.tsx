import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle, ViewProps } from 'react-native';
import { useTheme } from '../../util/theme';
import type { Theme as DesignTokenTheme } from '@metamask/design-tokens';

const createStyles = (colors: DesignTokenTheme['colors']) =>
  StyleSheet.create({
    wrapper: {
      borderWidth: 1,
      borderColor: colors.border.muted,
      borderRadius: 8,
      padding: 16,
    },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 3,
    },
    rowEnd: {
      justifyContent: 'flex-end',
    },
    rowLast: {
      marginBottom: 0,
      marginTop: 3,
    },
    col: {
      flexDirection: 'row',
      flex: 1,
      flexWrap: 'wrap',
    },
    separator: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border.muted,
      marginVertical: 6,
    },
  });

const useGetStyles = (): ReturnType<typeof createStyles> => {
  const { colors } = useTheme();
  return createStyles(colors);
};

type SummaryProps<T extends ViewProps = ViewProps> = T & {
  style?: StyleProp<ViewStyle>;
};

const Summary = <T extends ViewProps = ViewProps>({ style, ...props }: SummaryProps<T>) => {
  const styles = useGetStyles();
  return <View style={[styles.wrapper, style]} {...props} />;
};

type SummaryRowProps<T extends ViewProps = ViewProps> = T & {
  style?: StyleProp<ViewStyle>;
  end?: boolean;
  last?: boolean;
};

const SummaryRow = <T extends ViewProps = ViewProps>({ style, end, last, ...props }: SummaryRowProps<T>) => {
  const styles = useGetStyles();
  return (
    <View
      style={[styles.row, end && styles.rowEnd, last && styles.rowLast, style]}
      {...props}
    />
  );
};

type SummaryColProps<T extends ViewProps = ViewProps> = T & {
  style?: StyleProp<ViewStyle>;
  end?: boolean;
};

const SummaryCol = <T extends ViewProps = ViewProps>({ style, end, ...props }: SummaryColProps<T>) => {
  const styles = useGetStyles();
  return <View style={[styles.col, end && styles.rowEnd, style]} {...props} />;
};

type SummarySeparatorProps<T extends ViewProps = ViewProps> = T & {
  style?: StyleProp<ViewStyle>;
};

const SummarySeparator = <T extends ViewProps = ViewProps>({ style, ...props }: SummarySeparatorProps<T>) => {
  const styles = useGetStyles();
  return <View style={[styles.separator, style]} {...props} />;
};

type SummaryComponent = typeof Summary & {
  Row: typeof SummaryRow;
  Col: typeof SummaryCol;
  Separator: typeof SummarySeparator;
};

const SummaryWithComponents = Summary as SummaryComponent;

SummaryWithComponents.Row = SummaryRow;
SummaryWithComponents.Col = SummaryCol;
SummaryWithComponents.Separator = SummarySeparator;

export default SummaryWithComponents;
