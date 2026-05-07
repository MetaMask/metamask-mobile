import React from 'react';
import { render } from '@testing-library/react-native';

import { getHeaderCompactStandardNavbarOptions } from '../../../../../component-library/components-temp/HeaderCompactStandard';
import { BatchSellReview } from './BatchSellReview';
import { BatchSellReviewSelectorsIDs } from './BatchSellReview.testIds';

const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockHeaderOptions = { title: 'mock-header-options' };

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    goBack: mockGoBack,
    setOptions: mockSetOptions,
  }),
}));

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({
    style: () => ({}),
  }),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Text } = jest.requireActual('react-native');

  return {
    Box: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(View, props, children),
    BoxAlignItems: { Center: 'center' },
    BoxJustifyContent: { Center: 'center' },
    Text: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(Text, props, children),
    TextColor: { TextDefault: 'text-default' },
    TextVariant: { HeadingLg: 'heading-lg' },
  };
});

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');

  return {
    SafeAreaView: ({ children, ...props }: { children?: React.ReactNode }) =>
      ReactActual.createElement(View, props, children),
  };
});

jest.mock(
  '../../../../../component-library/components-temp/HeaderCompactStandard',
  () => ({
    getHeaderCompactStandardNavbarOptions: jest.fn(() => mockHeaderOptions),
  }),
);

describe('BatchSellReview', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the dummy review screen', () => {
    const { getByTestId, getByText } = render(<BatchSellReview />);

    expect(
      getByTestId(BatchSellReviewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(getByText('Batch Sell Review')).toBeOnTheScreen();
  });

  it('uses the compact standard header', () => {
    render(<BatchSellReview />);

    expect(getHeaderCompactStandardNavbarOptions).toHaveBeenCalledWith({
      title: '',
      onBack: expect.any(Function),
      includesTopInset: true,
    });
    expect(mockSetOptions).toHaveBeenCalledWith(mockHeaderOptions);

    const [{ onBack }] = (getHeaderCompactStandardNavbarOptions as jest.Mock)
      .mock.calls[0];
    onBack();

    expect(mockGoBack).toHaveBeenCalled();
  });
});
