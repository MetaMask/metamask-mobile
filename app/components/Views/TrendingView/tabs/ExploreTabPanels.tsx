import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { Box } from '@metamask/design-system-react-native';
import { useTheme } from '../../../../util/theme';
import { selectPerpsEnabledFlag } from '../../../UI/Perps';
import { selectPredictEnabledFlag } from '../../../UI/Predict';
import SectionHeader from '../components/SectionHeader/SectionHeader';
import {
  type SectionConfig,
  type SectionId,
  buildSections,
  DEFAULT_HOME_ORDER,
  SECTIONS_CONFIG,
} from '../sections.config';
import Section, { RefreshConfig } from '../components/Sections/Section';
import { TrendingViewSelectorsIDs } from '../TrendingView.testIds';

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
 * Renders the section list for one Explore tab.
 * Section sets are defined in `useExploreTabPanelSections` below.
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

/**
 * Discriminates which section list the Explore feed uses under the tab bar.
 * Keep in sync with `TabsList` children in `TrendingView`.
 */
export type ExploreTabId =
  | 'now'
  | 'macro'
  | 'rwas'
  | 'crypto'
  | 'sports'
  | 'dapps';

const useExploreTabPanelSections = (
  tab: ExploreTabId,
): {
  sections: (SectionConfig & { id: SectionId })[];
  scrollViewTestId?: string;
} => {
  const isPerpsEnabled = useSelector(selectPerpsEnabledFlag);
  const isPredictEnabled = useSelector(selectPredictEnabledFlag);

  return useMemo(() => {
    switch (tab) {
      case 'now':
        return {
          sections: buildSections(DEFAULT_HOME_ORDER, isPerpsEnabled),
          scrollViewTestId: TrendingViewSelectorsIDs.TRENDING_FEED_SCROLL_VIEW,
        };
      case 'macro': {
        const next: (SectionConfig & { id: SectionId })[] = [];
        if (isPredictEnabled) {
          next.push(SECTIONS_CONFIG.politics_predictions);
        }
        if (isPerpsEnabled) {
          next.push(SECTIONS_CONFIG.macro_stocks_commodity_perps);
        }
        return { sections: next };
      }
      case 'rwas': {
        const next: (SectionConfig & { id: SectionId })[] = [
          SECTIONS_CONFIG.stocks,
        ];
        if (isPredictEnabled) {
          next.push(SECTIONS_CONFIG.politics_predictions);
        }
        if (isPerpsEnabled) {
          next.push(SECTIONS_CONFIG.rwa_perps);
        }
        return { sections: next };
      }
      case 'crypto': {
        const next: (SectionConfig & { id: SectionId })[] = [
          SECTIONS_CONFIG.tokens,
          SECTIONS_CONFIG.crypto_movers,
        ];
        if (isPerpsEnabled) {
          next.push(SECTIONS_CONFIG.crypto_perps);
        }
        next.push(SECTIONS_CONFIG.crypto_predictions);
        return { sections: next };
      }
      case 'sports':
        return { sections: [SECTIONS_CONFIG.sports_predictions] };
      case 'dapps':
        return {
          sections: [SECTIONS_CONFIG.dapps_recents, SECTIONS_CONFIG.sites],
        };
      default: {
        const exhaustive: never = tab;
        return exhaustive;
      }
    }
  }, [tab, isPerpsEnabled, isPredictEnabled]);
};

export const ExploreTabPanel: React.FC<
  ExploreTabPanelProps & { tab: ExploreTabId }
> = (props) => {
  const { tab, ...rest } = props;
  const { sections, scrollViewTestId } = useExploreTabPanelSections(tab);

  return (
    <ExploreTabSectionedScroll
      {...rest}
      sections={sections}
      scrollViewTestId={scrollViewTestId}
    />
  );
};
