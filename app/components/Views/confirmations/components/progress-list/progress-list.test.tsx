import React from 'react';
import { render } from '@testing-library/react-native';
import { ProgressList } from './progress-list';
import { ProgressListItem } from './progress-list-item';

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
