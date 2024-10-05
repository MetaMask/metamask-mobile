import React from 'react';
import TooltipModal from './';
import { TooltipModalProps } from './ToolTipModal.types';
import renderWithProvider from '../../../util/test/renderWithProvider';
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

const MOCK_ROUTE_DATA: TooltipModalProps = {
  route: {
    params: {
      title: 'Test Tooltip',
      tooltip: 'This is a test tooltip',
    },
  },
};

describe('Tooltip Modal', () => {
  it('should render correctly', () => {
    const { toJSON } = renderWithProvider(
      <SafeAreaProvider>
        <TooltipModal {...MOCK_ROUTE_DATA} />
      </SafeAreaProvider>,
    );
    expect(toJSON()).toMatchSnapshot();
  });
});
