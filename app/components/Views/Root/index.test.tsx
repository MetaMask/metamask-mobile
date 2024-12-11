import React from 'react';
import Root from './';
import { render } from '@testing-library/react-native';

// Mock PersistGate component
jest.mock('redux-persist/lib/integration/react', () => ({
  PersistGate: ({ children }: { children: React.ReactNode }) => children,
}));

describe('Root', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<Root foxCode="" />);
    expect(toJSON()).toMatchSnapshot();
  });
});
