import React from 'react';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import MaxInputModal from '.';
import { SafeAreaProvider } from 'react-native-safe-area-context';

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

const renderMaxInputModal = () =>
  renderWithProvider(
    <SafeAreaProvider>
      <MaxInputModal />,
    </SafeAreaProvider>,
  );

describe('MaxInputModal', () => {
  it('render matches snapshot', () => {
    const { toJSON } = renderMaxInputModal();
    expect(toJSON()).toMatchSnapshot();
  });
});
