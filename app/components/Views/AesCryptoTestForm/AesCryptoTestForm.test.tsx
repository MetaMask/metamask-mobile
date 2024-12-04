import React from 'react';
import { render } from '@testing-library/react-native';

import AesCryptoTestForm from './AesCryptoTestForm';

jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn(),
}));

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: jest.fn(),
      setOptions: jest.fn(),
      goBack: jest.fn(),
    }),
  };
});

describe('AesCryptoTestForm', () => {
  it('renders correctly', () => {
    const wrapper = render(<AesCryptoTestForm />);

    expect(wrapper).toMatchSnapshot();
  });
});
