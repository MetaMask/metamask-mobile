import React from 'react';
import SsnInfoModal from './SsnInfoModal';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'SsnInfoModal',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('SsnInfoModal Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly and matches snapshot', () => {
    const { toJSON } = renderWithProvider(SsnInfoModal);
    expect(toJSON()).toMatchSnapshot();
  });
});
