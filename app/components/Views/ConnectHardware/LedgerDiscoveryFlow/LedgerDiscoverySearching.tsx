import React from 'react';
import SearchingForDevice from '../SearchingForDevice';

interface LedgerDiscoverySearchingProps {
  isBluetoothOff?: boolean;
}

const LedgerDiscoverySearching = ({ isBluetoothOff }: LedgerDiscoverySearchingProps) => (
  <SearchingForDevice isBluetoothOff={isBluetoothOff} />
);

export default LedgerDiscoverySearching;
