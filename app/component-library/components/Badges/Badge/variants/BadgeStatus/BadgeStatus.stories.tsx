/* eslint-disable no-console */
// Third party dependencies.
import React from 'react';
import { select } from '@storybook/addon-knobs';

// External dependencies.
import { storybookPropsGroupID } from '../../../../../constants/storybook.constants';
import { BadgeVariant } from '../../Badge.types';

// Internal dependencies.
import BadgeStatus from './BadgeStatus';
import { BadgeStatusState, BadgeStatusProps } from './BadgeStatus.types';

export const getBadgeStatusStoryProps = (): BadgeStatusProps => ({
  variant: BadgeVariant.Status,
  state: select(
    'state',
    BadgeStatusState,
    BadgeStatusState.Disconnected,
    storybookPropsGroupID,
  ),
});

const BadgeStatusStory = () => <BadgeStatus {...getBadgeStatusStoryProps()} />;

export default BadgeStatusStory;
