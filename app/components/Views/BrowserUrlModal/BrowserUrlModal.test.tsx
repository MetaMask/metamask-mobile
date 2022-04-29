import React from 'react';
import { shallow } from 'enzyme';
import BrowserUrlModal from './';
import { createNavigationProps } from '../../../util/testUtils';
import { BrowserUrlParams } from './BrowserUrlModal';

function mockOnUrlInputSubmit(_inputValue: string | undefined) {
  // noop
}

const mockParams: BrowserUrlParams = {
  onUrlInputSubmit: mockOnUrlInputSubmit,
  url: 'www.test.io',
};

const mockNavigation = createNavigationProps(mockParams);

jest.mock('@react-navigation/native', () => {
  const navigation = {
    params: {},
  };
  return {
    ...jest.requireActual<any>('@react-navigation/native'),
    useRoute: jest.fn(() => ({ params: navigation.params })),
    useNavigation: jest.fn(() => mockNavigation),
  };
});
describe('BrowserUrlModal', () => {
  it('should render correctly', () => {
    const wrapper = shallow(<BrowserUrlModal {...mockNavigation} />);
    expect(wrapper).toMatchSnapshot();
  });
});
