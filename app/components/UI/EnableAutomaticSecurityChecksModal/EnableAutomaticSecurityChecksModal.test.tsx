import React from 'react';
import { render } from '@testing-library/react-native';
import { EnableAutomaticSecurityChecksModal } from './';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      goBack: jest.fn(),
    }),
  };
});

jest.mock('react-native-device-info', () => ({
  getBrand: () => 'some brand',
  getBuildNumber: () => 'some build number',
  getVersion: () => 'some version',
}));

describe('EnableAutomaticSecurityChecksModal', () => {
  it('should render correctly', () => {
    const wrapper = render(<EnableAutomaticSecurityChecksModal />);
    expect(wrapper).toMatchSnapshot();
  });
});
