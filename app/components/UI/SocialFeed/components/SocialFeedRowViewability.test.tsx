import { act, render, screen } from '@testing-library/react-native';
import React, { useContext } from 'react';
import { Text } from 'react-native';
import {
  SocialFeedRowViewabilityProvider,
  createSocialFeedViewability,
  type SocialFeedViewability,
} from './SocialFeedRowViewability';
import { TraderStatRotationContext } from './TraderStatRotationContext';

const RotationProbe: React.FC = () => (
  <Text>{`rotates:${useContext(TraderStatRotationContext)}`}</Text>
);

const renderRow = (
  viewability: SocialFeedViewability,
  rowKey: string,
  pageOnScreen = true,
) =>
  render(
    <TraderStatRotationContext.Provider value={pageOnScreen}>
      <SocialFeedRowViewabilityProvider
        viewability={viewability}
        rowKey={rowKey}
      >
        <RotationProbe />
      </SocialFeedRowViewabilityProvider>
    </TraderStatRotationContext.Provider>,
  );

describe('createSocialFeedViewability', () => {
  it('treats every row as viewable until the list reports', () => {
    const viewability = createSocialFeedViewability();

    expect(viewability.isViewable('any')).toBe(true);
  });

  it('keeps only the reported rows viewable', () => {
    const viewability = createSocialFeedViewability();

    viewability.setViewableKeys(['one']);

    expect(viewability.isViewable('one')).toBe(true);
    expect(viewability.isViewable('two')).toBe(false);
  });

  it('stops notifying a listener once it unsubscribes', () => {
    const viewability = createSocialFeedViewability();
    const listener = jest.fn();
    const unsubscribe = viewability.subscribe(listener);

    viewability.setViewableKeys(['one']);
    unsubscribe();
    viewability.setViewableKeys(['two']);

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe('SocialFeedRowViewabilityProvider', () => {
  it('stops rotation once its row leaves the viewport', () => {
    const viewability = createSocialFeedViewability();
    renderRow(viewability, 'one');
    const rotatedInView = screen.queryByText('rotates:true') !== null;

    act(() => viewability.setViewableKeys(['two']));

    expect(rotatedInView).toBe(true);
    expect(screen.getByText('rotates:false')).toBeOnTheScreen();
  });

  it('never rotates a viewable row on a page that is off screen', () => {
    renderRow(createSocialFeedViewability(), 'one', false);

    expect(screen.getByText('rotates:false')).toBeOnTheScreen();
  });
});
