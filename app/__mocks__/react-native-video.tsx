import React from 'react';
import { View } from 'react-native';

type VideoMockProps = {
  testID?: string;
} & Record<string, unknown>;

const VideoMock = ({ testID, ...props }: VideoMockProps) => (
  <View testID={testID ?? 'mock-video'} {...props} />
);

VideoMock.displayName = 'VideoMock';

export default VideoMock;
