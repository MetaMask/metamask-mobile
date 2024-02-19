import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectChainId } from '../../../../../selectors/networkController';
import axios from 'axios';

const CHAIN_ID_NETWORK_URL = 'https://chainid.network/chains.json';

const withIsOriginalNativeToken = (WrappedComponent) => {
  // This is the functional component wrapper that can use hooks
  const WithIsOriginalNativeTokenWrapper = (props) => {
    // Use the useSelector hook to access Redux state
    const chainId = useSelector(selectChainId);

    const [matchedChainNetwork, setMatchedChainNetwork] = useState(null);

    useEffect(() => {
      axios.get(CHAIN_ID_NETWORK_URL).then(({ data: safeChainsList }) => {
        const matchedChainNetwork = safeChainsList.find(
          (network) => network.networkId === parseInt(chainId),
        );
        setMatchedChainNetwork({
          matchedChainNetwork,
        });
      });
    }, [chainId]);

    // Pass the value from useSelector as a prop to the WrappedComponent
    return (
      <WrappedComponent {...props} matchedChainNetwork={matchedChainNetwork} />
    );
  };

  return WithIsOriginalNativeTokenWrapper;
};

export default withIsOriginalNativeToken;
