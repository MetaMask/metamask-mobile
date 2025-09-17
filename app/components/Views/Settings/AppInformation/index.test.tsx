import React from 'react';
import { renderScreen } from '../../../../util/test/renderWithProvider';
import AppInformation from './';

const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
};

describe('AppInformation', () => {
  it('renders app information screen with navigation context', () => {
    const { toJSON } = renderScreen(
      () => <AppInformation navigation={mockNavigation} />,
      { name: 'AppInformation' },
      { state: {} },
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
