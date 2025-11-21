import React, { useCallback, useMemo } from 'react';
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
}

const SectionCard: React.FC<SectionCardProps> = ({ sectionId }) => {
  const navigation = useNavigation();
  const theme = useAppThemeFromContext();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { data, isLoading } = SECTIONS_CONFIG[sectionId].useSectionData();

  const renderFlatItem: ListRenderItem<unknown> = useCallback(
    ({ item }) => {
      const section = SECTIONS_CONFIG[sectionId];
      return section.renderRowItem(item, navigation);
    },
    [navigation, sectionId],
  );

  return (
    <Card style={styles.cardContainer} disabled>
      {isLoading && (
        <>
          {SECTIONS_CONFIG[sectionId].renderSkeleton()}
          {SECTIONS_CONFIG[sectionId].renderSkeleton()}
          {SECTIONS_CONFIG[sectionId].renderSkeleton()}
        </>
      )}
      {!isLoading && (
        <FlashList
          data={data.slice(0, 3)}
          renderItem={renderFlatItem}
          keyExtractor={(item) => SECTIONS_CONFIG[sectionId].keyExtractor(item)}
          keyboardShouldPersistTaps="handled"
          testID="perps-tokens-list"
        />
      )}
    </Card>
  );
};

export default SectionCard;
