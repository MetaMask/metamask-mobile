///: BEGIN:ONLY_INCLUDE_IF(external-snaps)
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import InstallSnapSuccess from '../InstallSnapSuccess';
import SNAP_INSTALL_SUCCESS from '../InstallSnapSuccess.constants';
import { SNAP_INSTALL_OK } from '../../../InstallSnapApproval.constants';

describe('InstallSnapSuccess', () => {
  const onConfirm = jest.fn();

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', () => {
    const { getByTestId } = render(
      <InstallSnapSuccess
        snapName="@lavamoat/tss-snap"
        onConfirm={onConfirm}
      />,
    );

    expect(getByTestId(SNAP_INSTALL_SUCCESS)).toBeDefined();
  });

  it('calls onConfirm when the OK button is pressed', () => {
    const { getByTestId } = render(
      <InstallSnapSuccess
        snapName="@lavamoat/tss-snap"
        onConfirm={onConfirm}
      />,
    );

    fireEvent.press(getByTestId(SNAP_INSTALL_OK));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('displays the correct snap name', () => {
    const { getByText } = render(
      <InstallSnapSuccess
        snapName="@lavamoat/tss-snap"
        onConfirm={onConfirm}
      />,
    );

    const expectedSnapName = '@lavamoat/tss-snap';
    expect(getByText(expectedSnapName)).toBeTruthy();
  });
});
///: END:ONLY_INCLUDE_IF
