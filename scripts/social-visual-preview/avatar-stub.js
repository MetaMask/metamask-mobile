import React from 'react';
import { View } from 'react-native';

const ProfileAvatar = (props) =>
  React.createElement(View, {
    testID: props.testID,
    style: { width: props.diameter ?? 40, height: props.diameter ?? 40 },
  });

export default ProfileAvatar;
