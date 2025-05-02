import React, { View} from 'react';

const withSafeArea = (story: any) => (
  <View>{story()}</View>
);

export default withSafeArea;
