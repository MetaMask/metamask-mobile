import React from 'react';
import IonicIcon from 'react-native-vector-icons/Ionicons';
import Device from '../../../../util/device';

const InfoIcon = (props) => (
  <IonicIcon
    name={
      Device.isAndroid() ? 'md-information-circle' : 'ios-information-circle'
    }
    size={Device.isAndroid() ? 14 : 16}
    {...props}
  />
);

export default InfoIcon;
