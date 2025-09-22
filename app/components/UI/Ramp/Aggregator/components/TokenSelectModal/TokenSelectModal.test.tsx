import React from 'react';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import TokenSelectModal from './TokenSelectModal';
import Routes from '../../../../../../constants/navigation/Routes';
import initialRootState from '../../../../../../util/test/initial-root-state';

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

const mockSetSelectedAsset = jest.fn();

jest.mock('../../sdk', () => ({
  useRampSDK: () => ({
    setSelectedAsset: mockSetSelectedAsset,
  }),
}));

describe('TokenSelectModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with the correct title and description', () => {
    const { toJSON } = render(TokenSelectModal);
    expect(toJSON()).toMatchSnapshot();
  });
});
