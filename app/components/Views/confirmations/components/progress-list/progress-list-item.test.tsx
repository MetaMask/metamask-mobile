import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { ProgressList } from './progress-list';
import { ProgressListItem } from './progress-list-item';

describe('ProgressListItem', () => {
  it('renders title and subtitle', () => {
    const { getByText, getByTestId } = render(
      <ProgressListItem
        title="Sent on Ethereum"
        subtitle="Aug 20, 2025"
        severity="success"
      />,
    );

    expect(getByText('Sent on Ethereum')).toBeDefined();
    expect(getByTestId('progress-list-item-subtitle').props.children).toBe(
      'Aug 20, 2025',
    );
  });

  it('renders button icon and handles press', () => {
    const onButtonPress = jest.fn();
    const { getByTestId } = render(
      <ProgressListItem
        title="Line"
        subtitle="Aug 20, 2025"
        severity="success"
        buttonIcon={IconName.Export}
        onButtonPress={onButtonPress}
      />,
    );

    fireEvent.press(getByTestId('block-explorer-button'));

    expect(onButtonPress).toHaveBeenCalledTimes(1);
  });

  it('does not render button when no icon provided', () => {
    const { queryByTestId } = render(
      <ProgressListItem
        title="Line"
        subtitle="Aug 20, 2025"
        severity="success"
      />,
    );

    expect(queryByTestId('block-explorer-button')).toBeNull();
  });

  it('renders status icon by default', () => {
    const { getByTestId, queryByTestId } = render(
      <ProgressListItem
        title="Line"
        subtitle="Aug 20, 2025"
        severity="success"
      />,
    );

    expect(getByTestId('status-icon-success')).toBeDefined();
    expect(queryByTestId('progress-status-dot-success')).toBeNull();
  });

  it('renders status dot instead of status icon in dot variant', () => {
    const { getByTestId, queryByTestId } = render(
      <ProgressList variant="dot">
        <ProgressListItem
          title="Line"
          subtitle="Aug 20, 2025"
          severity="success"
        />
      </ProgressList>,
    );

    expect(getByTestId('progress-status-dot-success')).toBeDefined();
    expect(queryByTestId('status-icon-success')).toBeNull();
  });

  it('renders button icon and handles press in dot variant', () => {
    const onButtonPress = jest.fn();
    const { getByTestId } = render(
      <ProgressList variant="dot">
        <ProgressListItem
          title="Line"
          subtitle="Aug 20, 2025"
          severity="success"
          buttonIcon={IconName.Export}
          onButtonPress={onButtonPress}
        />
      </ProgressList>,
    );

    fireEvent.press(getByTestId('block-explorer-button'));

    expect(onButtonPress).toHaveBeenCalledTimes(1);
  });
});
