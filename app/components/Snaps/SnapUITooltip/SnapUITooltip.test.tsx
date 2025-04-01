import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SnapUITooltip } from './SnapUITooltip';
import { Text, TouchableOpacity } from 'react-native';
import ApprovalModal from '../../Approvals/ApprovalModal';

jest.mock(
  '../../../component-library/components/BottomSheets/BottomSheetHeader',
  () => ({
    __esModule: true,
    default: function BottomSheetHeader({ onBack }: { onBack: () => void }) {
      setTimeout(onBack, 0);
      return null;
    },
  }),
);

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

    const touchable = getByText(children).parent as TouchableOpacity;
    fireEvent.press(touchable);

    const modal = UNSAFE_getByType(ApprovalModal);
    expect(modal.props.isVisible).toBe(true);
  });

  it('should close modal when back action is triggered', async () => {
    const content = 'Test content';
    const children = 'Click me';
    const { getByText, UNSAFE_getByType } = render(
      <SnapUITooltip content={<Text>{content}</Text>}>
        <Text>{children}</Text>
      </SnapUITooltip>,
    );

    const touchable = getByText(children).parent as TouchableOpacity;
    fireEvent.press(touchable);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const modal = UNSAFE_getByType(ApprovalModal);
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

    const touchable = getByText(children).parent as TouchableOpacity;
    fireEvent.press(touchable);

    const modal = UNSAFE_getByType(ApprovalModal);
    expect(modal).toBeTruthy();
    expect(getByText('Complex content')).toBeTruthy();
  });
});
