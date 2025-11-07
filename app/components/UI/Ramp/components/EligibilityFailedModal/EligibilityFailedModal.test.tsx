import React from 'react';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import EligibilityFailedModal from './EligibilityFailedModal';
import Routes from '../../../../../constants/navigation/Routes';
import initialRootState from '../../../../../util/test/initial-root-state';

function render(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: Routes.SHEET.ELIGIBILITY_FAILED_MODAL,
    },
    {
      state: initialRootState,
    },
  );
}

describe('EligibilityFailedModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with the correct title and description', () => {
    const { toJSON } = render(EligibilityFailedModal);

    expect(toJSON()).toMatchSnapshot();
  });
});
