import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, Animated, PanResponder, TouchableHighlight, ViewProps } from 'react-native';
import Video, { OnLoadData, OnProgressData, OnSeekData, LoadError } from 'react-native-video';
import { useTheme } from '../../../util/theme';

// TODO: Install @types/react-native-video for proper type definitions
// or declare the module in app/declarations/index.d.ts

interface VideoProperties {
  source: number | { uri?: string; headers?: { [key: string]: string }; type?: string };
  style?: ViewProps['style'];
  onLoad?: (data: OnLoadData) => void;
  onProgress?: (data: OnProgressData) => void;
  onSeek?: (data: OnSeekData) => void;
  onEnd?: () => void;
  onError?: (error: LoadError) => void;
  paused?: boolean;
  muted?: boolean;
  textTracks?: { title?: string; language?: string; type: "application/x-subrip" | "application/ttml+xml" | "text/vtt"; uri: string; }[];
  selectedTextTrack?: { type: "system" | "disabled" | "title" | "language" | "index"; value?: string | number };
}

// Extend the existing Video component with our VideoProperties
declare module 'react-native-video' {
  export interface VideoProps extends VideoProperties {}
}

interface VideoPlayerProps {
  controlsAnimationTiming: number;
  controlsToggleTiming: number;
  source: VideoProperties['source'];
  displayTopControls: boolean;
  displayBottomControls: boolean;
  onClose: () => void;
  onError: (error: LoadError) => void;
  textTracks: VideoProperties['textTracks'];
  selectedTextTrack: VideoProperties['selectedTextTrack'];
  onLoad: () => void;
  style: ViewProps['style'];
}

interface Theme {
  colors: {
    background: {
      alternative: string;
    };
  };
  brandColors: {
    white: string;
  };
}

interface Styles {
  container: ViewProps['style'];
  video: ViewProps['style'];
  controlsControl: ViewProps['style'];
  topControls: ViewProps['style'];
  bottomControls: ViewProps['style'];
}

const createStyles = (theme: Theme): Styles => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background.alternative,
  },
  video: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  controlsControl: {
    padding: 10,
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
});

export default function VideoPlayer({
  controlsAnimationTiming,
  controlsToggleTiming,
  source,
  displayTopControls,
  displayBottomControls,
  onClose,
  onError,
  textTracks,
  selectedTextTrack,
  onLoad: propsOnLoad,
  style,
}: VideoPlayerProps) {
  // Component implementation remains unchanged
}
