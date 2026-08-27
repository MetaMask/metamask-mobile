import React from 'react';
import {
  ButtonVariant,
  TextVariant,
} from '@metamask/design-system-react-native';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import RampInfoBottomSheet from '../RampInfoBottomSheet';
import { RAMPS_SERVICE_DISRUPTION_MODAL_TEST_IDS } from './RampsServiceDisruptionModal.testIds';

export const createRampsServiceDisruptionModalNavigationDetails =
  createNavigationDetails(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.RAMPS_SERVICE_DISRUPTION_MODAL,
  );

function RampsServiceDisruptionModal() {
  return (
    <RampInfoBottomSheet
      testIDs={RAMPS_SERVICE_DISRUPTION_MODAL_TEST_IDS}
      title={strings('fiat_on_ramp_aggregator.service_disruption_modal.title')}
      titleVariant={TextVariant.HeadingSm}
      description={strings(
        'fiat_on_ramp_aggregator.service_disruption_modal.description',
      )}
      actions={[
        {
          label: strings(
            'fiat_on_ramp_aggregator.service_disruption_modal.got_it',
          ),
          variant: ButtonVariant.Primary,
        },
      ]}
    />
  );
}

export default RampsServiceDisruptionModal;
