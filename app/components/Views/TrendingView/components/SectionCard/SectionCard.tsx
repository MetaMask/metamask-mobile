import React, { useCallback, useMemo, useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Theme } from '../../../../../util/theme/models';
import { useAppThemeFromContext } from '../../../../../util/theme';
import Card from '../../../../../component-library/components/Cards/Card';
import { SectionId, SECTIONS_CONFIG } from '../../config/sections.config';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    cardContainer: {
      borderRadius: 12,
      marginBottom: 20,
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: theme.colors.background.muted,
      borderWidth: 0,
    },
  });
interface SectionCardProps {
  sectionId: SectionId;
  refreshTrigger?: number;
}

const SectionCard: React.FC<SectionCardProps> = ({
  sectionId,
  refreshTrigger,
}) => {
  const navigation = useNavigation();
  const theme = useAppThemeFromContext();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const section = SECTIONS_CONFIG[sectionId];
  const { data, isLoading, refetch } = section.useSectionData();

  useEffect(() => {
    if (refreshTrigger && refreshTrigger > 0 && refetch) {
      refetch();
    }
  }, [refreshTrigger, refetch]);

  const renderFlatItem: ListRenderItem<unknown> = useCallback(
    ({ item }) => <section.RowItem item={item} navigation={navigation} />,
    [navigation, section],
  );

  return (
    <Card style={styles.cardContainer} disabled>
      {isLoading && (
        <>
          <section.Skeleton />
          <section.Skeleton />
          <section.Skeleton />
        </>
      )}
      {!isLoading && (
        <FlashList
          data={data.slice(0, 3)}
          renderItem={renderFlatItem}
          keyExtractor={(_, index) => `${section.id}-${index}`}
          keyboardShouldPersistTaps="handled"
          testID="perps-tokens-list"
        />
      )}
    </Card>
  );
};

export default SectionCard;
