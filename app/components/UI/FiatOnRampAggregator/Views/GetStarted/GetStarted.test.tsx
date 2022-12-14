import React from 'react';
import { shallow } from 'enzyme';

import GetStarted from './GetStarted';

import { IFiatOnRampSDK } from '../../sdk';

const mockuseFiatOnRampSDKInitialValues: Partial<IFiatOnRampSDK> = {
  getStarted: false,
  setGetStarted: jest.fn(),
  sdkError: undefined,
  selectedChainId: '1',
  selectedRegion: null,
};

let mockUseFiatOnRampSDKValues: Partial<IFiatOnRampSDK> = {
  ...mockuseFiatOnRampSDKInitialValues,
};

jest.mock('@react-navigation/native');

jest.mock('../../sdk', () => ({
  ...jest.requireActual('../../sdk'),
  useFiatOnRampSDK: () => mockUseFiatOnRampSDKValues,
}));

describe('GetStarted', () => {
  afterEach(() => {
    jest.resetModules();
  });

  it('should render correctly', () => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
    };
    const wrapper = shallow(<GetStarted />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly when sdkError is present', async () => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
      sdkError: new Error('sdkError'),
    };
    const wrapper = shallow(<GetStarted />);
    expect(wrapper).toMatchSnapshot();
  });

  it('should render correctly when getStarted is true', async () => {
    mockUseFiatOnRampSDKValues = {
      ...mockuseFiatOnRampSDKInitialValues,
      getStarted: true,
    };
    const wrapper = shallow(<GetStarted />);
    expect(wrapper).toMatchSnapshot();
  });
});
