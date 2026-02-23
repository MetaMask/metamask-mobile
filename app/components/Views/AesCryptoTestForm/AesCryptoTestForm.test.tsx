import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import AesCryptoTestForm from './AesCryptoTestForm';
import {
  aesCryptoFormHeader,
  aesCryptoFormHeaderBackButton,
  aesCryptoFormSafeArea,
} from './AesCrypto.testIds';

const mockGoBack = jest.fn();

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
      goBack: mockGoBack,
    }),
  };
});

describe('AesCryptoTestForm', () => {
  beforeEach(() => {
    mockGoBack.mockClear();
  });

  it('renders correctly', () => {
    const wrapper = render(<AesCryptoTestForm />);

    expect(wrapper).toMatchSnapshot();
  });

  it('wraps content in SafeAreaView from react-native-safe-area-context', () => {
    const { getByTestId } = render(<AesCryptoTestForm />);
    const safeArea = getByTestId(aesCryptoFormSafeArea);

    expect(safeArea).toBeTruthy();
    expect(safeArea.props.edges).toMatchObject({ bottom: 'additive' });
  });

  it('renders HeaderCompactStandard with title and back button', () => {
    const { getByTestId, getByText } = render(<AesCryptoTestForm />);

    expect(getByTestId(aesCryptoFormHeader)).toBeTruthy();
    expect(getByText('AES crypto - test form')).toBeTruthy();
    expect(getByTestId(aesCryptoFormHeaderBackButton)).toBeTruthy();
  });

  it('calls navigation.goBack when header back button is pressed', () => {
    const { getByTestId } = render(<AesCryptoTestForm />);

    fireEvent.press(getByTestId(aesCryptoFormHeaderBackButton));

    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });
});
