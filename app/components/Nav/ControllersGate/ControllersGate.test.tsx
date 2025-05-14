import React from 'react';
// Jest accepts prefixing out-of-scope variables with `mock`
import { View as MockView } from 'react-native';
import { render } from '@testing-library/react-native';
import ControllersGate from './ControllersGate';
import { useSelector } from 'react-redux';

const MOCK_FOX_LOADER_ID = 'FOX_LOADER_ID';
const MOCK_CHILDREN_ID = 'MOCK_CHILDREN_ID';
const MOCK_INITIAL_STATE = {
  user: {
    appServicesReady: true,
  },
};

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest
    .fn()
    .mockImplementation((callback) => callback(MOCK_INITIAL_STATE)),
}));

jest.mock(
  '../../UI/FoxLoader',
  () =>
    function MockFoxLoader() {
      return <MockView testID={MOCK_FOX_LOADER_ID}>Fox Loader</MockView>;
    },
);

describe('ControllersGate', () => {
  const mockChildren = (
    <MockView testID={MOCK_CHILDREN_ID}>Test Children</MockView>
  );

  it('renders children when appServicesReady is true', () => {
    (useSelector as jest.Mock).mockReturnValue(true);

    const { getByTestId, queryByTestId } = render(
      <ControllersGate>{mockChildren}</ControllersGate>,
    );

    expect(getByTestId(MOCK_CHILDREN_ID)).toBeTruthy();
    expect(queryByTestId(MOCK_FOX_LOADER_ID)).toBeNull();
  });

  it('renders FoxLoader when appServicesReady is false', () => {
    (useSelector as jest.Mock).mockReturnValue(false);

    const { getByTestId, queryByTestId } = render(
      <ControllersGate>{mockChildren}</ControllersGate>,
    );

    expect(getByTestId(MOCK_FOX_LOADER_ID)).toBeTruthy();
    expect(queryByTestId(MOCK_CHILDREN_ID)).toBeNull();
  });
});
