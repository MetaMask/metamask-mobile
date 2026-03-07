import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { IconName } from '../../../../../component-library/components/Icons/Icon';
import { ProgressList, ProgressListItem } from './progress-list';

describe('ProgressList', () => {
  it('renders dividers between items but not after the last', () => {
    const { getAllByTestId, queryAllByTestId } = render(
      <ProgressList>
        <ProgressListItem
          title="First"
          subtitle="First subtitle"
          severity="success"
        />
        <ProgressListItem
          title="Second"
          subtitle="Second subtitle"
          severity="success"
        />
        <ProgressListItem
          title="Third"
          subtitle="Third subtitle"
          severity="success"
        />
      </ProgressList>,
    );

    const dividers = queryAllByTestId('progress-list-divider');
    const subtitles = getAllByTestId('progress-list-item-subtitle');

    expect(dividers).toHaveLength(2);
    expect(subtitles).toHaveLength(3);
  });

  it('renders no dividers for a single item', () => {
    const { queryAllByTestId } = render(
      <ProgressList>
        <ProgressListItem
          title="Only"
          subtitle="Only subtitle"
          severity="success"
        />
      </ProgressList>,
    );

    expect(queryAllByTestId('progress-list-divider')).toHaveLength(0);
  });

  it('filters out falsy children', () => {
    const { queryAllByTestId } = render(
      <ProgressList>
        {null}
        <ProgressListItem
          title="First"
          subtitle="First subtitle"
          severity="success"
        />
        {false}
        <ProgressListItem
          title="Second"
          subtitle="Second subtitle"
          severity="success"
        />
      </ProgressList>,
    );

    expect(queryAllByTestId('progress-list-divider')).toHaveLength(1);
    expect(queryAllByTestId('progress-list-item-subtitle')).toHaveLength(2);
  });
});

describe('ProgressListItem', () => {
  it('renders subtitle text', () => {
    const { getByTestId } = render(
      <ProgressListItem
        title="Line"
        subtitle="Aug 20, 2025"
        severity="success"
      />,
    );

    const subtitle = getByTestId('progress-list-item-subtitle');

    expect(subtitle.props.children).toBe('Aug 20, 2025');
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
});
