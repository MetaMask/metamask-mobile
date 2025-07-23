import React from 'react';
import { fireEvent } from '@testing-library/react-native';
import ManageCardListItem from './ManageCardListItem';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../util/test/initial-root-state';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { View } from 'react-native';

function renderWithProvider(component: React.ComponentType) {
  return renderScreen(
    component,
    {
      name: 'ManageCardListItem',
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('ManageCardListItem Component', () => {
  const mockOnPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with required props and matches snapshot', () => {
    const { toJSON } = renderWithProvider(() => (
      <ManageCardListItem title="Test Title" description="Test description" />
    ));

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with all props and matches snapshot', () => {
    const { toJSON } = renderWithProvider(() => (
      <ManageCardListItem
        title="Custom Title"
        description="Custom description"
        rightIcon={IconName.Edit}
        testID="custom-test-id"
        onPress={mockOnPress}
      />
    ));

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with React.ReactNode description and matches snapshot', () => {
    const customDescription = (
      <React.Fragment>
        <View>Custom</View>
      </React.Fragment>
    );

    const { toJSON } = renderWithProvider(() => (
      <ManageCardListItem
        title="Title with React Node"
        description={customDescription}
      />
    ));

    expect(toJSON()).toMatchSnapshot();
  });

  it('calls onPress when item is pressed', () => {
    const { getByTestId } = renderWithProvider(() => (
      <ManageCardListItem
        title="Test Title"
        description="Test description"
        onPress={mockOnPress}
        testID="pressable-item"
      />
    ));

    const item = getByTestId('pressable-item');
    fireEvent.press(item);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('renders with default right icon when rightIcon is not provided', () => {
    const { toJSON } = renderWithProvider(() => (
      <ManageCardListItem
        title="Default Icon Test"
        description="Should use ArrowRight icon"
      />
    ));

    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with custom right icon when rightIcon is provided', () => {
    const { toJSON } = renderWithProvider(() => (
      <ManageCardListItem
        title="Custom Icon Test"
        description="Should use Edit icon"
        rightIcon={IconName.Edit}
      />
    ));

    expect(toJSON()).toMatchSnapshot();
  });

  it('uses default testID when testID is not provided', () => {
    const { getByTestId } = renderWithProvider(() => (
      <ManageCardListItem
        title="Default TestID"
        description="Should use default testID"
        onPress={mockOnPress}
      />
    ));

    const item = getByTestId('manage-card-list-item');
    fireEvent.press(item);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  it('does not crash when onPress is not provided', () => {
    const { getByTestId } = renderWithProvider(() => (
      <ManageCardListItem
        title="No OnPress"
        description="Should not crash"
        testID="no-onpress-item"
      />
    ));

    const item = getByTestId('no-onpress-item');

    expect(() => fireEvent.press(item)).not.toThrow();
  });
});
