/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { storiesOf } from '@storybook/react-native';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { BadgeVariants } from '../../Badge.types';
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';

// Internal dependencies.
import BadgeStatus from './BadgeStatus';
import { BadgeStatusState } from './BadgeStatus.types';

storiesOf('Component Library / BadgeStatus', module).add('Default', () => {
  const stateSelector = select(
    'state',
    BadgeStatusState,
    BadgeStatusState.Disconnected,
    storybookPropsGroupID,
  );
  return <BadgeStatus variant={BadgeVariants.Status} state={stateSelector} />;
});
