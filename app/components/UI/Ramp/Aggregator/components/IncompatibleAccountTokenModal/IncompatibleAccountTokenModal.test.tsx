import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import IncompatibleAccountTokenModal from './IncompatibleAccountTokenModal';
import Routes from '../../../../../../constants/navigation/Routes';
import initialRootState from '../../../../../../util/test/initial-root-state';
import { strings } from '../../../../../../../locales/i18n';

function render(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: Routes.RAMP.MODALS.INCOMPATIBLE_ACCOUNT_TOKEN,
    },
    {
      state: initialRootState,
    },
  );
}

describe('IncompatibleAccountTokenModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with the correct title and description', () => {
    render(IncompatibleAccountTokenModal);
    expect(
      screen.getByText(
        strings(
          'fiat_on_ramp_aggregator.incompatible_token_account_modal.title',
        ),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(
        strings('fiat_on_ramp_aggregator.incompatible_token_account_modal.cta'),
      ),
    ).toBeOnTheScreen();
  });
});
