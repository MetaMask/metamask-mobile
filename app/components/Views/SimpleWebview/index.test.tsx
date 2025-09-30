import React from 'react';
import { shallow } from 'enzyme';
import SimpleWebview from './';

jest.mock('../../UI/Navbar', () => ({
  getWebviewNavbar: jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useRoute: jest.fn(() => ({
    params: { url: 'https://etherscan.io', title: 'etherscan' },
  })),
}));

describe('SimpleWebview', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<SimpleWebview />);
    expect(wrapper).toMatchSnapshot();
  });
});
