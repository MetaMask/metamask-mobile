import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import SuccessErrorSheet from '.';
import {
  IconColor,
  IconName,
} from '../../../component-library/components/Icons/Icon';
import renderWithProvider from '../../../util/test/renderWithProvider';
import type { SuccessErrorSheetParams } from './interface';

const mockGoBack = jest.fn();

let mockRouteParams: SuccessErrorSheetParams;

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheet',
  () => ({
    __esModule: true,
    default: jest.fn(({ children }) => (
      <div data-testid="mock-bottom-sheet">{children}</div>
    )),
  }),
);

function createDefaultSuccessParams(): SuccessErrorSheetParams {
  return {
    title: 'Test Title',
    description: 'Test Description',
    type: 'success',
    primaryButtonLabel: 'Primary',
    secondaryButtonLabel: 'Secondary',
    onPrimaryButtonPress: jest.fn(),
    onSecondaryButtonPress: jest.fn(),
    onClose: jest.fn(),
    customButton: null,
    descriptionAlign: 'center',
    reverseButtonOrder: true,
    icon: IconName.Confirmation,
  };
}

describe('SuccessErrorSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = createDefaultSuccessParams();
  });

  it('render matches snapshot', () => {
    const { toJSON } = renderWithProvider(<SuccessErrorSheet />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders correctly with all props', () => {
    const { getByText, getByRole } = renderWithProvider(<SuccessErrorSheet />);

    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Description')).toBeTruthy();

    const primaryButton = getByRole('button', { name: 'Primary' });
    const secondaryButton = getByRole('button', { name: 'Secondary' });

    fireEvent.press(primaryButton);
    expect(mockRouteParams.onPrimaryButtonPress).toHaveBeenCalled();

    fireEvent.press(secondaryButton);
    expect(mockRouteParams.onSecondaryButtonPress).toHaveBeenCalled();
  });

  it('renders correctly with error type', () => {
    mockRouteParams = {
      title: <Text>Test Title</Text>,
      description: <Text>Test Description</Text>,
      type: 'error',
      icon: IconName.CircleX,
      iconColor: IconColor.Warning,
      onPrimaryButtonPress: jest.fn(),
      onSecondaryButtonPress: jest.fn(),
      onClose: jest.fn(),
      customButton: <Text>Custom Button</Text>,
      descriptionAlign: 'center',
    };

    const { getByText } = renderWithProvider(<SuccessErrorSheet />);

    expect(getByText('Test Title')).toBeTruthy();
    expect(getByText('Test Description')).toBeTruthy();
    expect(getByText('Custom Button')).toBeTruthy();
  });
});
