import React from 'react';
import { shallow } from 'enzyme';
import { BrowserTab } from './';

jest.useFakeTimers();
jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => ({
    browser: { activeTab: '' },
    engine: {
      backgroundState: {
        PermissionController: {
          subjects: {},
        },
      },
    },
    transaction: {
      selectedAsset: '',
    },
  })),
}));

describe('Browser', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<BrowserTab initialUrl="https://metamask.io" />);
    expect(wrapper).toMatchSnapshot();
  });
});
