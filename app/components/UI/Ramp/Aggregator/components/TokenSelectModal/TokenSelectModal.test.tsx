import React from 'react';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import TokenSelecModal from './TokenSelecModal';
import Routes from '../../../../../../../constants/navigation/Routes';
import initialRootState from '../../../../../../../util/test/initial-root-state';

function render(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: Routes.RAMP.MODALS.TOKEN_SELECTOR,
    },
    {
      state: initialRootState,
    },
  );
}

describe('TokenSelecModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with the correct title and description', () => {
    const { toJSON } = render(TokenSelecModal);
    expect(toJSON()).toMatchSnapshot();
  });
});
