import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
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

const useGetStyles = () => {
  const { colors } = useTheme();
  return createStyles(colors);
};

interface SummaryProps {
  style?: StyleProp<ViewStyle>;
}

interface SummaryRowProps extends SummaryProps {
  end?: boolean;
  last?: boolean;
}

interface SummaryColProps extends SummaryProps {
  end?: boolean;
}

interface SummarySeparatorProps extends SummaryProps {}

interface SummaryComponent extends React.FC<SummaryProps> {
  Row: React.FC<SummaryRowProps>;
  Col: React.FC<SummaryColProps>;
  Separator: React.FC<SummarySeparatorProps>;
}

const Summary: SummaryComponent = ({ style, ...props }) => {
  const styles = useGetStyles();
  return <View style={[styles.wrapper, style]} {...props} />;
};

const SummaryRow: React.FC<SummaryRowProps> = ({ style, end, last, ...props }) => {
  const styles = useGetStyles();
  return (
    <View
      style={[styles.row, end && styles.rowEnd, last && styles.rowLast, style]}
      {...props}
    />
  );
};

const SummaryCol: React.FC<SummaryColProps> = ({ style, end, ...props }) => {
  const styles = useGetStyles();
  return <View style={[styles.col, end && styles.rowEnd, style]} {...props} />;
};

const SummarySeparator: React.FC<SummarySeparatorProps> = ({ style, ...props }) => {
  const styles = useGetStyles();
  return <View style={[styles.separator, style]} {...props} />;
};

Summary.Row = SummaryRow;
Summary.Col = SummaryCol;
Summary.Separator = SummarySeparator;

export default Summary;
