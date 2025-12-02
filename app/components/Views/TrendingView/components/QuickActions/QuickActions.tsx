import React from 'react';
import { ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Icon,
  IconColor,
  IconSize,
  Text,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { SECTIONS_ARRAY } from '../../config/sections.config';

/**
 * A dynamic component that automatically generates action buttons based on the
 * centralized sections configuration. When a new section is added to SECTIONS_CONFIG,
 * a corresponding button will automatically appear here.
 */
const QuickActions: React.FC = () => {
  const navigation = useNavigation();
  const tw = useTailwind();

  return (
    <Box twClassName="mt-1 mb-4">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Box twClassName="flex-row gap-2">
          {SECTIONS_ARRAY.map((section) => (
            <TouchableOpacity
              key={section.id}
              onPress={() => section.viewAllAction(navigation)}
              testID={`quick-action-${section.id}`}
              style={tw.style(
                'flex-row items-center justify-center gap-1 rounded-2xl bg-background-section px-3 py-2',
              )}
            >
              <Icon
                name={section.icon}
                size={IconSize.Md}
                color={IconColor.IconAlternative}
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
