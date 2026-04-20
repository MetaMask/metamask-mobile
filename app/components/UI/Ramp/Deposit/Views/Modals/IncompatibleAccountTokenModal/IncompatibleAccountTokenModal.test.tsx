import React from 'react';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import IncompatibleAccountTokenModal from './IncompatibleAccountTokenModal';
import Routes from '../../../../../../../constants/navigation/Routes';
import initialRootState from '../../../../../../../util/test/initial-root-state';

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
    const { toJSON } = render(IncompatibleAccountTokenModal);
    expect(toJSON()).toMatchSnapshot();
  });
});
