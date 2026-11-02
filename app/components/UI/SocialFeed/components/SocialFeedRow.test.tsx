import { act, render, screen } from '@testing-library/react-native';
import React from 'react';
import { createSocialFeedEntrances } from '../data/socialFeedEntrances';
import { mockOpenPerpsFeedItem } from '../mocks/socialV1Feed.mock';
import type { SocialV1FeedPost } from '../types';
import SocialFeedRow, {
  areSocialFeedRowPropsEqual,
  type SocialFeedRowProps,
} from './SocialFeedRow';

jest.mock('./SocialFeedPostShell', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ post }: { post: SocialV1FeedPost }) => (
      <Text>{post.item.pnlLabel}</Text>
    ),
  };
});

jest.mock('./FeedItemEntryAnimation', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      eventId,
    }: {
      children: React.ReactNode;
      eventId?: string;
    }) => (
      <>
        {eventId ? <Text>{`entering ${eventId}`}</Text> : null}
        {children}
      </>
    ),
  };
});

const post = (overrides: Partial<SocialV1FeedPost> = {}): SocialV1FeedPost => ({
  id: 'post-1',
  authorHandle: 'ada',
  timestampMs: 1,
  reactions: [{ emotion: 'heart', count: 1 }],
  item: mockOpenPerpsFeedItem({ id: 'post-1' }),
  ...overrides,
});

const rowProps = (
  overrides: Partial<SocialFeedRowProps> = {},
): SocialFeedRowProps => ({ post: post(), ...overrides });

describe('SocialFeedRow', () => {
  it('renders a divider only when given its test id', () => {
    const { rerender } = render(<SocialFeedRow {...rowProps()} />);
    const firstRowDivider = screen.queryByTestId('divider');

    rerender(<SocialFeedRow {...rowProps({ dividerTestID: 'divider' })} />);

    expect(firstRowDivider).toBeNull();
    expect(screen.getByTestId('divider')).toBeOnTheScreen();
  });

  it('plays a realtime entrance until it is marked played', () => {
    const entrances = createSocialFeedEntrances();
    render(
      <SocialFeedRow
        {...rowProps({
          post: post({ realtimeEventId: 'event-1' }),
          entrances,
        })}
      />,
    );
    const wasEntering = screen.queryByText('entering event-1') !== null;

    act(() => entrances.markPlayed('event-1'));

    expect(wasEntering).toBe(true);
    expect(screen.queryByText('entering event-1')).toBeNull();
  });

  it('never plays an entrance without the realtime ledger', () => {
    render(
      <SocialFeedRow {...rowProps({ post: post({ realtimeEventId: 'e' }) })} />,
    );

    expect(screen.queryByText('entering e')).toBeNull();
  });
});

describe('areSocialFeedRowPropsEqual', () => {
  it('treats a rebuilt post with the same content as equal', () => {
    const previous = rowProps();

    const equal = areSocialFeedRowPropsEqual(previous, {
      ...previous,
      post: { ...previous.post, reactions: [{ emotion: 'heart', count: 1 }] },
    });

    expect(equal).toBe(true);
  });

  it.each<[string, Partial<SocialV1FeedPost>]>([
    ['reaction counts', { reactions: [{ emotion: 'heart', count: 2 }] }],
    ['the mapped item', { item: mockOpenPerpsFeedItem({ id: 'post-1' }) }],
    ['the realtime event', { realtimeEventId: 'event-2' }],
    ['the copy count', { copyCount: 4 }],
  ])('rerenders when %s change', (_label, change) => {
    const previous = rowProps();

    const equal = areSocialFeedRowPropsEqual(previous, {
      ...previous,
      post: { ...previous.post, ...change },
    });

    expect(equal).toBe(false);
  });

  it('rerenders when the divider or motion changes', () => {
    const previous = rowProps();

    const dividerEqual = areSocialFeedRowPropsEqual(previous, {
      ...previous,
      dividerTestID: 'divider',
    });
    const motionEqual = areSocialFeedRowPropsEqual(previous, {
      ...previous,
      reducedMotion: true,
    });

    expect(dividerEqual).toBe(false);
    expect(motionEqual).toBe(false);
  });

  it('rerenders when the clock moves so relative ages stay current', () => {
    const previous = { ...rowProps(), now: 1_000 };

    const equal = areSocialFeedRowPropsEqual(previous, {
      ...previous,
      now: 61_000,
    });

    expect(equal).toBe(false);
  });
});
