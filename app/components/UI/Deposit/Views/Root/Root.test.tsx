import React from 'react';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import Root from './Root';
import Routes from '../../../../../constants/navigation/Routes';

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockReset = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
      reset: mockReset,
    }),
  };
});

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.ROOT,
    },
    {
      state: {
        engine: {
          backgroundState: {},
        },
      },
    },
  );
}

describe('Root Component', () => {
  afterEach(() => {
    mockNavigate.mockClear();
    mockSetOptions.mockClear();
    mockReset.mockClear();
  });

  it('renders correctly and redirects to build quote', () => {
    render(Root);
    expect(mockReset).toBeCalledWith({
      index: 0,
      routes: [{ name: Routes.DEPOSIT.BUILD_QUOTE }],
    });
  });
});
