import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  FontWeight,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SectionId, useQuickActionsSectionsArray } from '../../sections.config';
import { TrendingViewSelectorsIDs } from '../../TrendingView.testIds';
import { AppNavigationProp } from '../../../../../core/NavigationService/types';

interface QuickActionsProps {
  /** Set of section IDs that have empty data and should be hidden */
  emptySections: Set<SectionId>;
}

/**
 * A dynamic component that automatically generates action buttons based on the
 * centralized sections configuration. When a new section is added to SECTIONS_CONFIG,
 * a corresponding button will automatically appear here.
 */
const QuickActions: React.FC<QuickActionsProps> = ({ emptySections }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const tw = useTailwind();
  const sectionsArray = useQuickActionsSectionsArray();

  const visibleSections = sectionsArray.filter((s) => !emptySections.has(s.id));

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
