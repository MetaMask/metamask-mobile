import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import Tabs from './';
import initialBackgroundState from '../../../util/test/initial-background-state.json';

const mockInitialState = {
  wizard: {
    step: 1,
  },
  engine: {
    backgroundState: initialBackgroundState,
  },
};

jest.mock('react-native-safe-area-context', () => {
  const inset = { top: 1, right: 2, bottom: 3, left: 4 };
  return {
    SafeAreaInsetsContext: {
      Consumer: jest.fn().mockImplementation(({ children }) => children(inset)),
    },
  };
});

describe('Tabs', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <Tabs tabs={[{ id: 1, url: 'about:blank', image: '', id: 123 }]} />,
      { state: mockInitialState },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
