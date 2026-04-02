import React from 'react';
import { screen } from '@testing-library/react-native';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual('react-native-safe-area-context/jest/mock').default,
);

import ErrorDetailsModal from './ErrorDetailsModal';
import { strings } from '../../../../../../../../locales/i18n';

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(component, {
    name: 'ErrorDetailsModal',
  });
}

const mockUseParams = jest.fn();
jest.mock('../../../../../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(),
  useParams: () => mockUseParams(),
}));

describe('ErrorDetailsModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({
      errorMessage: 'This is a test error message.',
    });
  });

  it('renders the error message and title', () => {
    renderWithProvider(ErrorDetailsModal);
    expect(
      screen.getByText(strings('deposit.errors.error_details_title')),
    ).toBeOnTheScreen();
    expect(screen.getByText('This is a test error message.')).toBeOnTheScreen();
  });
});
