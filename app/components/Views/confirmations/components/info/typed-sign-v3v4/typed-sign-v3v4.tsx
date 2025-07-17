import React from 'react';
import { View } from 'react-native';

import { ConfirmationInfoComponentIDs } from '../../../constants/info-ids';
import AccountNetworkInfoRow from '../../rows/account-network-info-row';
import { InfoSectionOriginAndDetails } from './info-section-origin-and-details';
import Message from './message';
import TypedSignV3V4Simulation from './simulation';

const TypedSignV3V4 = () => (
  <View testID={ConfirmationInfoComponentIDs.SIGN_TYPED_DATA_V3V4}>
    <AccountNetworkInfoRow />
    <TypedSignV3V4Simulation />
    <InfoSectionOriginAndDetails />
    <Message />
  </View>
);

export default TypedSignV3V4;
