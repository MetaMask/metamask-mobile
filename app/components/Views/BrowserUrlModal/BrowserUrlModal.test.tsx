import React from 'react';
import { render } from '@testing-library/react-native';
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
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...jest.requireActual<any>('@react-navigation/native'),
    useRoute: jest.fn(() => ({ params: navigation.params })),
    useNavigation: jest.fn(() => mockNavigation),
  };
});
describe('BrowserUrlModal', () => {
  it('should render correctly', () => {
    const { toJSON } = render(<BrowserUrlModal {...mockNavigation} />);
    expect(toJSON()).toMatchSnapshot();
  });
});
