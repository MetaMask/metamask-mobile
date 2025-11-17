import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Box, TextVariant } from '@metamask/design-system-react-native';
import ButtonFilter from '../../../../../component-library/components-temp/ButtonFilter';
import { SECTIONS_ARRAY } from '../../config/sections.config';

/**
 * A dynamic component that automatically generates action buttons based on the
 * centralized sections configuration. When a new section is added to SECTIONS_CONFIG,
 * a corresponding button will automatically appear here.
 */
const QuickActions: React.FC = () => {
  const navigation = useNavigation();

  return (
    <Box twClassName="mb-3">
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Box twClassName="flex-row gap-2">
          {SECTIONS_ARRAY.map((section) => (
            <ButtonFilter
              key={section.id}
              isActive={false}
              onPress={() => section.viewAllAction(navigation)}
              testID={`quick-action-${section.id}`}
              textProps={{ variant: TextVariant.BodySm }}
            >
              {section.title}
            </ButtonFilter>
          ))}
        </Box>
      </ScrollView>
    </Box>
  );
};

export default QuickActions;
