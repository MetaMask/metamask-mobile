import React from 'react';
import { View } from 'react-native';

type VideoMockProps = { testID?: string } & Record<string, unknown>;

const VideoMock = ({ testID, ...rest }: VideoMockProps) => (
  <View testID={testID ?? 'mock-video'} {...rest} />
);

VideoMock.displayName = 'VideoMock';

export default VideoMock;
