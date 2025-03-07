import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SnapUITooltip } from './SnapUITooltip';
import { Text, TouchableOpacity } from 'react-native';
import ApprovalModal from '../../Approvals/ApprovalModal';

jest.mock('../../../component-library/hooks/useStyles', () => ({
  useStyles: () => ({ styles: {} }),
}));

// Mock the ButtonIcon component
jest.mock('../../../component-library/components/Buttons/ButtonIcon', () => ({
  __esModule: true,
  default: () => null,
  ButtonIconSizes: {
    Md: 'Md',
  },
}));

// Mock the Icon component
jest.mock('../../../component-library/components/Icons/Icon', () => ({
  IconName: {
    ArrowLeft: 'ArrowLeft',
  },
  IconColor: {
    Default: 'Default',
  },
}));

describe('SnapUITooltip', () => {
  it('should render tooltip with content and children', () => {
    const content = 'Test content';
    const children = 'Click me';
    const { getByText } = render(
      <SnapUITooltip content={<Text>{content}</Text>}>
        <Text>{children}</Text>
      </SnapUITooltip>,
    );

    expect(getByText(children)).toBeTruthy();
  });

  it('should open modal on press', () => {
    const content = 'Test content';
    const children = 'Click me';
    const { getByText, UNSAFE_getByType } = render(
      <SnapUITooltip content={<Text>{content}</Text>}>
        <Text>{children}</Text>
      </SnapUITooltip>,
    );

    const touchable = getByText(children).parent?.parent as TouchableOpacity;
    fireEvent.press(touchable);

    const modal = UNSAFE_getByType(ApprovalModal);
    expect(modal.props.isVisible).toBe(true);
  });

  it('should close modal when cancel is pressed', () => {
    const content = 'Test content';
    const children = 'Click me';
    const { getByText, UNSAFE_getByType } = render(
      <SnapUITooltip content={<Text>{content}</Text>}>
        <Text>{children}</Text>
      </SnapUITooltip>,
    );

    const touchable = getByText(children).parent?.parent as TouchableOpacity;
    fireEvent.press(touchable);

    const modal = UNSAFE_getByType(ApprovalModal);
    fireEvent(modal, 'onCancel');

    expect(modal.props.isVisible).toBe(false);
  });

  it('should render complex content in modal', () => {
    const content = <Text>Complex content</Text>;
    const children = 'Click me';
    const { getByText, UNSAFE_getByType } = render(
      <SnapUITooltip content={content}>
        <Text>{children}</Text>
      </SnapUITooltip>,
    );

    const touchable = getByText(children).parent?.parent as TouchableOpacity;
    fireEvent.press(touchable);

    const modal = UNSAFE_getByType(ApprovalModal);
    expect(modal).toBeTruthy();
    expect(getByText('Complex content')).toBeTruthy();
  });
});
