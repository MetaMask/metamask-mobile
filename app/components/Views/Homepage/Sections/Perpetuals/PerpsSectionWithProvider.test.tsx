import React from 'react';
import { screen } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PerpsSectionWithProvider from './PerpsSectionWithProvider';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('../../../../UI/Perps', () => ({
  selectPerpsEnabledFlag: jest.fn(() => true),
}));

jest.mock('../../../../UI/Perps/providers/PerpsConnectionProvider', () => ({
  PerpsConnectionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('../../../../UI/Perps/providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('./PerpsSection', () => {
  const RN = jest.requireActual('react-native');
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: () => ReactActual.createElement(RN.Text, null, 'PerpsSection'),
  };
});

describe('PerpsSectionWithProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .requireMock('../../../../UI/Perps')
      .selectPerpsEnabledFlag.mockReturnValue(true);
  });

  it('renders PerpsSection when perps is enabled', () => {
    renderWithProvider(<PerpsSectionWithProvider />);

    expect(screen.getByText('PerpsSection')).toBeOnTheScreen();
  });

  it('returns null when perps is disabled', () => {
    jest
      .requireMock('../../../../UI/Perps')
      .selectPerpsEnabledFlag.mockReturnValue(false);

    const { toJSON } = renderWithProvider(<PerpsSectionWithProvider />);

    expect(toJSON()).toBeNull();
  });
});
