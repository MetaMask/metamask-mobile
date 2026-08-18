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

  it('renders dotted connectors between items but not after the last in dot variant', () => {
    const { getAllByTestId, queryAllByTestId } = render(
      <ProgressList variant="dot">
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
      </ProgressList>,
    );

    expect(getAllByTestId('progress-list-dotted-connector')).toHaveLength(1);
    expect(getAllByTestId('progress-status-dot-success')).toHaveLength(2);
    expect(queryAllByTestId('progress-list-divider')).toHaveLength(0);
  });

  it('hides dividers when showConnectors is false', () => {
    const { queryAllByTestId } = render(
      <ProgressList showConnectors={false}>
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

    expect(queryAllByTestId('progress-list-divider')).toHaveLength(0);
    expect(queryAllByTestId('progress-list-item-subtitle')).toHaveLength(3);
  });
});
