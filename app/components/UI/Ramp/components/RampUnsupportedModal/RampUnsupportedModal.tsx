import React from 'react';
import { ButtonVariant } from '@metamask/design-system-react-native';
import { createNavigationDetails } from '../../../../../util/navigation/navUtils';
import Routes from '../../../../../constants/navigation/Routes';
import { strings } from '../../../../../../locales/i18n';
import RampInfoBottomSheet from '../RampInfoBottomSheet';
import { RAMP_UNSUPPORTED_MODAL_TEST_IDS } from './RampUnsupportedModal.testIds';

export const createRampUnsupportedModalNavigationDetails =
  createNavigationDetails(
    Routes.MODAL.ROOT_MODAL_FLOW,
    Routes.SHEET.UNSUPPORTED_REGION_MODAL,
  );

function RampUnsupportedModal() {
  return (
    <RampInfoBottomSheet
      testIDs={RAMP_UNSUPPORTED_MODAL_TEST_IDS}
      title={strings('fiat_on_ramp_aggregator.unsupported_region_modal.title')}
      description={strings(
        'fiat_on_ramp_aggregator.unsupported_region_modal.description',
      )}
      actions={[
        {
          label: strings(
            'fiat_on_ramp_aggregator.unsupported_region_modal.got_it',
          ),
          variant: ButtonVariant.Primary,
        },
      ]}
    />
  );
}

export default RampUnsupportedModal;
