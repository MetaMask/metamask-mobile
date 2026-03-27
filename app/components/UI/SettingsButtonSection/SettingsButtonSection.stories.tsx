import React from 'react';

import { Box, BoxBackgroundColor } from '@metamask/design-system-react-native';

import SettingsButtonSection from './index';

const SettingsButtonSectionMeta = {
  title: 'Components / UI / SettingsButtonSection',
  component: SettingsButtonSection,
  decorators: [
    (Story: React.FC) => (
      <Box backgroundColor={BoxBackgroundColor.BackgroundDefault} padding={4}>
        <Story />
      </Box>
    ),
  ],
};

export default SettingsButtonSectionMeta;

export const Default = {
  args: {
    sectionTitle: 'Section title',
    sectionButtonText: 'Do thing',
    descriptionText: 'Description text',
    needsModal: false,
    onPress: () => undefined,
  },
};

export const WithModal = {
  args: {
    sectionTitle: 'Section title',
    sectionButtonText: 'Open modal',
    descriptionText: 'Description text',
    needsModal: true,
    modalTitleText: 'Modal title',
    modalDescriptionText: 'Modal description text',
    modalConfirmButtonText: 'Confirm',
    modalCancelButtonText: 'Cancel',
  },
};
