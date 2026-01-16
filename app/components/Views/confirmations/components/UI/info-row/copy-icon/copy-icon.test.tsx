import React from 'react';
import TouchableOpacity from '../../../../../../Base/TouchableOpacity';
import { fireEvent, render } from '@testing-library/react-native';
import CopyIcon from './copy-icon';
import {
  IconColor,
  IconName,
} from '../../../../../../../component-library/components/Icons/Icon/Icon.types';
import ClipboardManager from '../../../../../../../core/ClipboardManager';

jest.mock('../../../../../../../core/ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

describe('CopyIcon', () => {
  const mockProps = {
    textToCopy: 'text to copy',
    color: IconColor.Primary,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the copy icon', () => {
    const { UNSAFE_getByProps } = render(<CopyIcon {...mockProps} />);
    expect(UNSAFE_getByProps({ name: IconName.Copy })).toBeDefined();
  });

  it('copies text to clipboard when pressed', async () => {
    const { UNSAFE_getAllByType } = render(<CopyIcon {...mockProps} />);
    const touchable = UNSAFE_getAllByType(TouchableOpacity)[0];

    fireEvent.press(touchable);

    expect(ClipboardManager.setString).toHaveBeenCalledTimes(1);
    expect(ClipboardManager.setString).toHaveBeenCalledWith(
      mockProps.textToCopy,
    );
  });

  it('does not call ClipboardManager if textToCopy is empty', () => {
    const emptyTextProps = {
      ...mockProps,
      textToCopy: '',
    };

    const { UNSAFE_getAllByType } = render(<CopyIcon {...emptyTextProps} />);
    const touchable = UNSAFE_getAllByType(TouchableOpacity)[0];

    fireEvent.press(touchable);

    expect(ClipboardManager.setString).not.toHaveBeenCalled();
  });

  it('sets the correct color prop on the icon', () => {
    const customColorProps = {
      ...mockProps,
      color: IconColor.Success,
    };

    const { UNSAFE_getByProps } = render(<CopyIcon {...customColorProps} />);
    const icon = UNSAFE_getByProps({ name: IconName.Copy });

    expect(icon.props.color).toBe(IconColor.Success);
  });
});
