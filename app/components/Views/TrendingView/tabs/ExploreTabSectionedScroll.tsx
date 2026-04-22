import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import { useTheme } from '../../../../util/theme';
import QuickActions from '../components/QuickActions/QuickActions';
import SectionHeader from '../components/SectionHeader/SectionHeader';
import { type SectionConfig, type SectionId } from '../sections.config';
import Section, { RefreshConfig } from '../components/Sections/Section';

const curriedSetSectionState =
  (setState: (updater: (prev: Set<SectionId>) => Set<SectionId>) => void) =>
  (sectionId: SectionId) =>
  (isActive: boolean): void => {
    setState((prev) => {
      const newSet = new Set(prev);
      if (isActive) {
        newSet.add(sectionId);
      } else {
        newSet.delete(sectionId);
      }
      return newSet;
    });
  };

const useSectionStateTracker = (
  sections: { id: SectionId }[],
): {
  sectionsWithState: Set<SectionId>;
  callbacks: Record<SectionId, (isActive: boolean) => void>;
} => {
  const [activeSections, setActiveSections] = useState<Set<SectionId>>(
    new Set(),
  );

  const callbacks = useMemo(() => {
    const result = {} as Record<SectionId, (isActive: boolean) => void>;
    sections.forEach((s) => {
      result[s.id] = curriedSetSectionState(setActiveSections)(s.id);
    });
    return result;
  }, [sections]);

  return { sectionsWithState: activeSections, callbacks };
};

export interface ExploreTabSectionedScrollProps {
  sections: (SectionConfig & { id: SectionId })[];
  /**
   * Only the Now tab should set the main feed `testID` so tests that call `getByTestId`
   * for the scroll view do not match hidden tabs' scroll views.
   */
  scrollViewTestId?: string;
  refreshConfig: RefreshConfig;
  refreshing: boolean;
  onRefresh: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
  tw: ReturnType<typeof useTailwind>;
}

export type ExploreTabPanelProps = Omit<
  ExploreTabSectionedScrollProps,
  'sections' | 'scrollViewTestId'
>;

/**
 * Renders quick actions (when the tab has sections) and the section list for one Explore tab.
 * Each tab panel should call one `use*Sections` hook from `sections.config` and pass the result.
 */
export const ExploreTabSectionedScroll: React.FC<
  ExploreTabSectionedScrollProps
> = ({
  sections,
  scrollViewTestId,
  refreshConfig,
  refreshing,
  onRefresh,
  colors,
  tw,
}) => {
  const { sectionsWithState: emptySections, callbacks: emptyStateCallbacks } =
    useSectionStateTracker(sections);

  const noopLoadingState = useCallback((_isLoading: boolean) => undefined, []);

  const hasSections = sections.length > 0;

  return (
    <ScrollView
      testID={scrollViewTestId}
      style={tw.style('flex-1 px-4')}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.icon.default}
          colors={[colors.primary.default]}
        />
      }
    >
      {hasSections && <QuickActions emptySections={emptySections} />}

      {sections.map((section) => {
        const isHidden = emptySections.has(section.id);

        const sectionComponent = (
          <Section
            sectionId={section.id}
            refreshConfig={refreshConfig}
            toggleSectionEmptyState={emptyStateCallbacks[section.id]}
            toggleSectionLoadingState={noopLoadingState}
          />
        );

        return (
          <Box key={section.id} twClassName={isHidden ? 'hidden' : undefined}>
            <SectionHeader sectionId={section.id} />
            {section.SectionWrapper ? (
              <section.SectionWrapper>
                {sectionComponent}
              </section.SectionWrapper>
            ) : (
              sectionComponent
            )}
          </Box>
        );
      })}
    </ScrollView>
  );
};
