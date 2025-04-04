// Internal dependencies.
import { default as BadgeStatusComponent } from './BadgeStatus';
import { SAMPLE_BADGESTATUS_PROPS } from './BadgeStatus.constants';
import { BadgeStatusState } from './BadgeStatus.types';

const BadgeStatusMeta = {
  title: 'Component Library / Badges',
  component: BadgeStatusComponent,
  argTypes: {
    state: {
      options: BadgeStatusState,
      control: {
        type: 'select',
      },
      defaultValue: SAMPLE_BADGESTATUS_PROPS.state,
    },
  },
};
export default BadgeStatusMeta;

export const BadgeStatus = {};
