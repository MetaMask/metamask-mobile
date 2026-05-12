import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import IncompatibleAccountTokenModal from './IncompatibleAccountTokenModal';
import Routes from '../../../../../../../constants/navigation/Routes';
import initialRootState from '../../../../../../../util/test/initial-root-state';
import { strings } from '../../../../../../../../locales/i18n';

function render(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: Routes.DEPOSIT.MODALS.INCOMPATIBLE_ACCOUNT_TOKEN,
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
        strings('deposit.incompatible_token_acount_modal.title'),
      ),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('deposit.incompatible_token_acount_modal.cta')),
    ).toBeOnTheScreen();
  });
});
