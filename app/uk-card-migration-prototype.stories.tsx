import React from 'react';
import { UkCardMigrationPrototype } from './features/uk-card-migration-prototype/UkCardMigrationPrototype';

const meta = {
  title: 'Dev prototypes/UK card migration',
  component: UkCardMigrationPrototype,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const CompleteMigrationFlow = {
  render: () => <UkCardMigrationPrototype />,
};