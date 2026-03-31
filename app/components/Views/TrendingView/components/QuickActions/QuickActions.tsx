import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Icon as DSIcon,
  IconColor as DSIconColor,
  IconSize as DSIconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import LocalIcon, {
  IconColor as LocalIconColor,
  IconSize as LocalIconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  useSectionsArray,
  SectionId,
  type SectionIcon,
} from '../../sections.config';
import { TrendingViewSelectorsIDs } from '../../TrendingView.testIds';

const SectionIconRenderer: React.FC<{
  icon: SectionIcon;
  style?: object;
}> = ({ icon, style }) => {
  if (icon.source === 'design-system') {
    return (
      <DSIcon
        name={icon.name}
        size={DSIconSize.Md}
        color={DSIconColor.IconAlternative}
        style={style}
      />
    );
  }
  return (
    <LocalIcon
      name={icon.name}
      size={LocalIconSize.Md}
      color={LocalIconColor.Alternative}
      style={style}
    />
  );
};

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
  const navigation = useNavigation();
  const tw = useTailwind();
  const sectionsArray = useSectionsArray();

  const visibleSections = sectionsArray.filter((s) => !emptySections.has(s.id));

  return (
    <Box twClassName="mt-1 mb-4">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        testID={TrendingViewSelectorsIDs.QUICK_ACTIONS_SCROLL_VIEW}
      >
        <Box twClassName="flex-row gap-2">
          {visibleSections.map((section) => (
            <TouchableOpacity
              key={section.id}
              onPress={() => section.viewAllAction(navigation)}
              testID={`quick-action-${section.id}`}
              style={tw.style(
                'flex-row items-center justify-center gap-1 rounded-xl bg-background-section px-3 py-2',
              )}
            >
              <SectionIconRenderer
                icon={section.icon}
                style={tw.style('-ml-1')}
              />
              <Text variant={TextVariant.BodySm}>{section.title}</Text>
            </TouchableOpacity>
          ))}
        </Box>
      </ScrollView>
    </Box>
  );
};

export default QuickActions;
