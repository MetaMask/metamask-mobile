///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import InstallSnapError from '../InstallSnapError';
import SNAP_INSTALL_ERROR from '../InstallSnapError.constants';
import { SNAP_INSTALL_OK } from '../../../InstallSnapApproval.constants';

describe('InstallSnapError', () => {
  const onConfirm = jest.fn();
  const error = new Error('Installation failed');

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <InstallSnapError
        snapName="@lavamoat/tss-snap"
        onConfirm={onConfirm}
        error={error}
      />,
    );

    expect(getByTestId(SNAP_INSTALL_ERROR)).toBeTruthy();
  });

  it('calls onConfirm when the OK button is pressed', () => {
    const { getByTestId } = render(
      <InstallSnapError
        snapName="@lavamoat/tss-snap"
        onConfirm={onConfirm}
        error={error}
      />,
    );

    fireEvent.press(getByTestId(SNAP_INSTALL_OK));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('displays the correct snap name', () => {
    const { getByText } = render(
      <InstallSnapError
        snapName="@lavamoat/tss-snap"
        onConfirm={onConfirm}
        error={error}
      />,
    );

    const expectedSnapName = '@lavamoat/tss-snap';
    expect(getByText(expectedSnapName)).toBeTruthy();
  });

  it('displays the correct error title', () => {
    const { getByText } = render(
      <InstallSnapError
        snapName="@lavamoat/tss-snap"
        onConfirm={onConfirm}
        error={error}
      />,
    );

    expect(getByText('Installation failed')).toBeTruthy();
  });
});
///: END:ONLY_INCLUDE_IF
