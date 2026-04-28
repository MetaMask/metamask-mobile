import React from 'react';
import MaxBrowserTabsModal from './MaxBrowserTabsModal';
import renderWithProvider from '../../../util/test/renderWithProvider';

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      goBack: jest.fn(),
      reset: jest.fn(),
      getParent: () => ({
        pop: jest.fn(),
      }),
    }),
  };
});

describe('MaxBrowserTabsModal', () => {
  it('should render correctly', () => {
    const { getByText } = renderWithProvider(<MaxBrowserTabsModal />);
    getByText('Maximum tabs reached');
  });
});
