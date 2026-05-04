import React, { useMemo } from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../locales/i18n';
import Routes from '../../../../constants/navigation/Routes';
import type { AppNavigationProp } from '../../../../core/NavigationService/types';
import type { PerpsNavigationParamList } from '../../../UI/Perps/types/navigation';
import { navigateToPerpsMarketList } from '../feeds/perps/perpsNavigation';
import { navigateToPredictionsList } from '../feeds/predictions/predictionsNavigation';
import { TrendingViewSelectorsIDs } from '../TrendingView.testIds';

export type SectionId = 'tokens' | 'perps' | 'stocks' | 'predictions' | 'sites';

interface QuickActionSection {
  id: SectionId;
  title: string;
  viewAllAction: (navigation: AppNavigationProp) => void;
}

interface QuickActionsProps {
  /** Set of section IDs that have empty data and should be hidden */
  emptySections: Set<SectionId>;
}

/**
 * Horizontal quick-action pills for Explore (Trending → Perps → Stocks → Predictions → Sites).
 */
const QuickActions: React.FC<QuickActionsProps> = ({ emptySections }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();

  const sectionsArray = useMemo<QuickActionSection[]>(
    () => [
      {
        id: 'tokens',
        title: strings('trending.trending_tokens'),
        viewAllAction: (nav) => {
          nav.navigate(Routes.WALLET.TRENDING_TOKENS_FULL_VIEW);
        },
      },
      {
        id: 'perps',
        title: strings('trending.perps'),
        viewAllAction: (nav) => {
          navigateToPerpsMarketList(
            nav as NavigationProp<PerpsNavigationParamList>,
          );
        },
      },
      {
        id: 'stocks',
        title: strings('trending.stocks'),
        viewAllAction: (nav) => {
          nav.navigate(Routes.WALLET.RWA_TOKENS_FULL_VIEW);
        },
      },
      {
        id: 'predictions',
        title: strings('wallet.predict'),
        viewAllAction: (nav) => {
          navigateToPredictionsList(nav, 'trending');
        },
      },
      {
        id: 'sites',
        title: strings('trending.sites'),
        viewAllAction: (nav) => {
          nav.navigate(Routes.SITES_FULL_VIEW);
        },
      },
    ],
    [],
  );

  const visibleSections = sectionsArray.filter((s) => !emptySections.has(s.id));

  if (visibleSections.length === 0) {
    return null;
  }

  return (
    <Box twClassName="mb-7 -mx-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        testID={TrendingViewSelectorsIDs.QUICK_ACTIONS_SCROLL_VIEW}
        contentContainerStyle={tw.style('px-4')}
      >
        <Box twClassName="flex-row gap-2">
          {visibleSections.map((section) => (
            <TouchableOpacity
              key={section.id}
              onPress={() => section.viewAllAction(navigation)}
              // Use `tokens` suffix for E2E / View All naming (`section-header-view-all-tokens`), not `trending`
              testID={`quick-action-${section.id}`}
              style={tw.style(
                'flex-row items-center justify-center rounded-xl bg-background-section py-2 pl-4 pr-3',
              )}
            >
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {section.title}
              </Text>
            </TouchableOpacity>
          ))}
        </Box>
      </ScrollView>
    </Box>
  );
};

export default QuickActions;
