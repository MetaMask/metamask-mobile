import React from 'react';
import renderWithProvider from '../../..//util/test/renderWithProvider';
import { UpdateNeeded } from './';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('react-native-device-info', () => ({
  getBrand: () => 'some brand',
  getBuildNumber: () => 'some build number',
  getVersion: () => 'some version',
}));

describe('UpdateNeeded', () => {
  it('should render correctly', () => {
    const wrapper = renderWithProvider(<UpdateNeeded />, {});
    expect(wrapper).toMatchSnapshot();
  });
});
