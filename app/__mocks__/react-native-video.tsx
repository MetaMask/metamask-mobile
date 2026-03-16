import React from 'react';
import { View } from 'react-native';

const VideoMock = ({ testID }: { testID?: string }) => (
  <View testID={testID ?? 'mock-video'} />
);

VideoMock.displayName = 'VideoMock';

export default VideoMock;
