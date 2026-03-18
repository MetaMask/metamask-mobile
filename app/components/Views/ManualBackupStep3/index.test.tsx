import React from 'react';
import ManualBackupStep3 from './';
import { render } from '@testing-library/react-native';
import { ThemeContext, mockTheme } from '../../../util/theme';
import renderWithProvider from '../../../util/test/renderWithProvider';

jest.mock('react-native-confetti-cannon', () => {
  const { View } = require('react-native');
  return View;
});

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ goBack: jest.fn(), navigate: jest.fn(), setOptions: jest.fn() }),
}));

describe('ManualBackupStep3', () => {
  it('should render correctly', () => {
    const mockRoute = { params: { steps: [] } };
    const mockNavigation = { goBack: jest.fn(), navigate: jest.fn(), setOptions: jest.fn() };
    const component = renderWithProvider(
      <ManualBackupStep3 route={mockRoute} navigation={mockNavigation} />,
    );
    expect(component).toMatchSnapshot();
  });
});
