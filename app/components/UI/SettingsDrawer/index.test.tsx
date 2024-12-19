import React from 'react';
import { render } from '@testing-library/react-native';
import SettingsDrawer from './';
import { IconName } from '../../../component-library/components/Icons/Icon';

const originalEnv = process.env;

describe('SettingsDrawer', () => {
  const originalProps = {
    title: 'Test Title',
    onPress: jest.fn(),
    description: 'Test Description',
    renderArrowRight: true,
  };
  const redesignProps = {
    ...originalProps,
    iconName: IconName.Setting,
    iconColor: 'red',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('SettingsDrawer', () => {
    it('should render correctly', () => {
      process.env.MM_SETTINGS_REDESIGN_ENABLE = 'false';
      const { toJSON } = render(<SettingsDrawer {...originalProps} />);
      expect(toJSON()).toMatchSnapshot();
    });
    it('should render with redesign enabled', () => {
      process.env.MM_SETTINGS_REDESIGN_ENABLE = 'true';
      const { toJSON } = render(<SettingsDrawer {...redesignProps} />);
      expect(toJSON()).toMatchSnapshot();
    });
  });
});
