import React from 'react';
import renderWithProvider from '../../../util/test/renderWithProvider';
import WhatsNewModal from './';

// Mock the useNavigation hook
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

describe('WhatsNewModal', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(<WhatsNewModal />);
    expect(toJSON()).toMatchSnapshot();
  });
});
