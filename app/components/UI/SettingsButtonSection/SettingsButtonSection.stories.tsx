import React from 'react';

import { Box, BoxBackgroundColor } from '@metamask/design-system-react-native';

import SettingsButtonSection from './index';

const SettingsButtonSectionMeta = {
  title: 'Components / UI / SettingsButtonSection',
  component: SettingsButtonSection,
};

export default SettingsButtonSectionMeta;

export const Default = {
  args: {
    sectionTitle: 'Section title',
    sectionButtonText: 'Section button text',
    descriptionText: 'Description text',
    needsModal: false,
    onPress: () => undefined,
  },
};
