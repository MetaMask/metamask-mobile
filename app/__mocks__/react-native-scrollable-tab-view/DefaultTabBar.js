/* eslint-disable react-native/no-inline-styles */
/* eslint-disable react/prop-types */
import React from 'react';
import { View } from 'react-native';

// Mock DefaultTabBar component with all the expected props and style handling
const DefaultTabBar = (props) => {
  const {
    underlineStyle,
    activeTextColor,
    inactiveTextColor,
    backgroundColor,
    tabStyle,
    textStyle,
    style,
    ...restProps
  } = props;

  // Mock component that accepts all the style props without breaking
  return (
    <View
      {...restProps}
      style={[
        {
          height: 50,
          backgroundColor: backgroundColor || '#fff',
          flexDirection: 'row',
        },
        style,
      ]}
    />
  );
};

export default DefaultTabBar;
