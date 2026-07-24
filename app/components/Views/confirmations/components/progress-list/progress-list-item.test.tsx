import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { strings } from '../../../../../../locales/i18n';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { STATUS_ICON_TOOLTIP_TEST_ID } from '../status-icon/status-icon.testIds';
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

  it('replaces subtitle with failed label for failed steps in dot variant', () => {
    const { getByText, queryByText } = render(
      <ProgressList variant="dot">
        <ProgressListItem
          title="Line"
          subtitle="Aug 20, 2025"
          severity="error"
        />
      </ProgressList>,
    );

    expect(getByText(strings('transaction.failed'))).toBeDefined();
    expect(queryByText('Aug 20, 2025')).toBeNull();
  });

  it('replaces subtitle with spinner and pending label for in-flight steps in dot variant', () => {
    const { getByText, getByTestId, queryByText } = render(
      <ProgressList variant="dot">
        <ProgressListItem
          title="Line"
          subtitle="Aug 20, 2025"
          severity="warning"
        />
      </ProgressList>,
    );

    // The spinner is decorative and hidden from assistive technology, so it
    // must be queried with hidden elements included.
    expect(
      getByTestId('progress-list-item-pending-spinner', {
        includeHiddenElements: true,
      }),
    ).toBeDefined();
    expect(getByText(strings('transaction.pending'))).toBeDefined();
    expect(queryByText('Aug 20, 2025')).toBeNull();
  });

  it('does not render the error tooltip in dot variant', () => {
    const { queryByTestId } = render(
      <ProgressList variant="dot">
        <ProgressListItem
          title="Line"
          subtitle="Aug 20, 2025"
          severity="error"
          tooltip="Nonce too low"
        />
      </ProgressList>,
    );

    expect(queryByTestId(STATUS_ICON_TOOLTIP_TEST_ID)).toBeNull();
    expect(queryByTestId('status-icon-error')).toBeNull();
  });
});
