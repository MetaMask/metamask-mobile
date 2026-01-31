import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { useSelector } from 'react-redux';
import { PredictProviderGated } from './PredictProviderGated';
import { PredictProvider } from './PredictProvider';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./PredictProvider', () => ({
  PredictProvider: jest.fn(({ children }) => children),
}));

const mockUseSelector = useSelector as jest.MockedFunction<typeof useSelector>;
const MockPredictProvider = PredictProvider as jest.MockedFunction<
  typeof PredictProvider
>;

describe('PredictProviderGated', () => {
  const TestChild = () => <Text testID="test-child">Test Child</Text>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when predict feature is disabled', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(false);
    });

    it('renders children without PredictProvider wrapper', () => {
      const { getByTestId } = render(
        <PredictProviderGated>
          <TestChild />
        </PredictProviderGated>,
      );

      expect(getByTestId('test-child')).toBeTruthy();
      expect(MockPredictProvider).not.toHaveBeenCalled();
    });

    it('renders multiple children when feature is disabled', () => {
      const { getByText } = render(
        <PredictProviderGated>
          <Text>Child 1</Text>
          <Text>Child 2</Text>
        </PredictProviderGated>,
      );

      expect(getByText('Child 1')).toBeTruthy();
      expect(getByText('Child 2')).toBeTruthy();
      expect(MockPredictProvider).not.toHaveBeenCalled();
    });
  });

  describe('when predict feature is enabled', () => {
    beforeEach(() => {
      mockUseSelector.mockReturnValue(true);
    });

    it('wraps children with PredictProvider', () => {
      render(
        <PredictProviderGated>
          <TestChild />
        </PredictProviderGated>,
      );

      expect(MockPredictProvider).toHaveBeenCalled();
    });

    it('passes children to PredictProvider', () => {
      render(
        <PredictProviderGated>
          <TestChild />
        </PredictProviderGated>,
      );

      const providerCall = MockPredictProvider.mock.calls[0][0];
      expect(providerCall.children).toBeDefined();
    });
  });

  describe('feature flag selector', () => {
    it('uses selectPredictEnabledFlag selector', () => {
      mockUseSelector.mockReturnValue(false);

      render(
        <PredictProviderGated>
          <TestChild />
        </PredictProviderGated>,
      );

      expect(mockUseSelector).toHaveBeenCalledWith(expect.any(Function));
    });
  });
});
