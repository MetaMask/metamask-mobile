import React from 'react';
import { screen, fireEvent } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PerpsSection from './PerpsSection';
import Routes from '../../../../../constants/navigation/Routes';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../UI/Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(() => true),
}));

describe('PerpsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock return value to default (true) to ensure test isolation
    jest
      .requireMock('../../../../UI/Perps')
      .selectPerpsEnabledFlag.mockReturnValue(true);
  });

  it('renders section title when enabled', () => {
    renderWithProvider(<PerpsSection />);

    expect(screen.getByText('Perpetuals')).toBeOnTheScreen();
  });

  it('navigates to perps home on title press', () => {
    renderWithProvider(<PerpsSection />);

    fireEvent.press(screen.getByText('Perpetuals'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
      screen: Routes.PERPS.PERPS_HOME,
    });
  });

  it('returns null when perps is disabled', () => {
    jest
      .requireMock('../../../../UI/Perps')
      .selectPerpsEnabledFlag.mockReturnValue(false);

    const { toJSON } = renderWithProvider(<PerpsSection />);

    expect(toJSON()).toBeNull();
  });
});
