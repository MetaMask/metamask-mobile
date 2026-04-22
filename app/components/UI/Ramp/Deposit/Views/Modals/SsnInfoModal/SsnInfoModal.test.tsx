import React from 'react';
import { screen } from '@testing-library/react-native';
import SsnInfoModal from './SsnInfoModal';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../../util/test/initial-root-state';
import { strings } from '../../../../../../../../locales/i18n';

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

  it('renders the title and description', () => {
    renderWithProvider(SsnInfoModal);
    expect(
      screen.getByText(strings('deposit.ssn_info_modal.title')),
    ).toBeOnTheScreen();
    expect(
      screen.getByText(strings('deposit.ssn_info_modal.description')),
    ).toBeOnTheScreen();
  });
});
