import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import {
  SocialFeedSurfaceProvider,
  useSocialFeedSurface,
} from './SocialFeedSurface';

const Probe: React.FC = () => {
  const { location, showMockedFields } = useSocialFeedSurface();
  return (
    <Text testID="surface">{`${location ?? 'none'}:${showMockedFields}`}</Text>
  );
};

describe('SocialFeedSurfaceProvider', () => {
  it('hides mocked fields and has no location when nothing is mounted', () => {
    render(<Probe />);

    expect(screen.getByTestId('surface')).toHaveTextContent('none:false');
  });

  it('lets an inner provider replace only the fields it sets', () => {
    render(
      <SocialFeedSurfaceProvider location="my_profile" showMockedFields>
        <SocialFeedSurfaceProvider location="social_trending">
          <Probe />
        </SocialFeedSurfaceProvider>
      </SocialFeedSurfaceProvider>,
    );

    expect(screen.getByTestId('surface')).toHaveTextContent(
      'social_trending:true',
    );
  });

  it('can turn mocked fields back off under a surface that shows them', () => {
    render(
      <SocialFeedSurfaceProvider showMockedFields>
        <SocialFeedSurfaceProvider showMockedFields={false}>
          <Probe />
        </SocialFeedSurfaceProvider>
      </SocialFeedSurfaceProvider>,
    );

    expect(screen.getByTestId('surface')).toHaveTextContent('none:false');
  });
});
