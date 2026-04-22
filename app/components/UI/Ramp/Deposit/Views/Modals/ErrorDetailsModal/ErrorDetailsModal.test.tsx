import React from 'react';
import { renderScreen } from '../../../../../../../util/test/renderWithProvider';
import ErrorDetailsModal from './ErrorDetailsModal';

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

  it('renders correctly and matches snapshot', () => {
    const { toJSON } = renderWithProvider(ErrorDetailsModal);
    expect(toJSON()).toMatchSnapshot();
  });
});
