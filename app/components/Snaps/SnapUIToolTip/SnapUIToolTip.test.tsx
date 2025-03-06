import React from 'react';
import { render } from '@testing-library/react-native';
import { SnapUITooltip } from './SnapUITooltip';
import Tooltip from '../../Views/confirmations/components/UI/Tooltip';
import { Text } from 'react-native';

jest.mock('../../Views/confirmations/components/UI/Tooltip', () => jest.fn());

describe('SnapUITooltip', () => {
  it('should render tooltip with content', () => {
    const content = 'Test content';
    render(<SnapUITooltip content={content} />);

    expect(Tooltip).toHaveBeenCalledWith(
      expect.objectContaining({
        content,
      }),
      expect.any(Object),
    );
  });

  it('should render tooltip with complex content', () => {
    const content = <Text>Complex content</Text>;
    render(<SnapUITooltip content={content} />);

    expect(Tooltip).toHaveBeenCalledWith(
      expect.objectContaining({
        content,
      }),
      expect.any(Object),
    );
  });
});
