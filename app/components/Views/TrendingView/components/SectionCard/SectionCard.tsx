import React, { PropsWithChildren, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';
import { useAppThemeFromContext } from '../../../../../util/theme';
import Card from '../../../../../component-library/components/Cards/Card';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    cardContainer: {
      borderRadius: 12,
      marginBottom: 20,
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background.muted,
      borderColor: theme.colors.border.muted,
    },
  });

const SectionCard: React.FC<PropsWithChildren> = ({ children }) => {
  const theme = useAppThemeFromContext();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Card style={styles.cardContainer} disabled>
      {children}
    </Card>
  );
};

export default SectionCard;
