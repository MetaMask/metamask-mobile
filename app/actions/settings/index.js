export function setSearchEngine(searchEngine) {
  return {
    type: 'SET_SEARCH_ENGINE',
    searchEngine,
  };
}

export function setShowHexData(showHexData) {
  return {
    type: 'SET_SHOW_HEX_DATA',
    showHexData,
  };
}

export function setShowCustomNonce(showCustomNonce) {
  return {
    type: 'SET_SHOW_CUSTOM_NONCE',
    showCustomNonce,
  };
}

export function setShowFiatOnTestnets(showFiatOnTestnets) {
  return {
    type: 'SET_SHOW_FIAT_ON_TESTNETS',
    showFiatOnTestnets,
  };
}

export function setHideZeroBalanceTokens(hideZeroBalanceTokens) {
  return {
    type: 'SET_HIDE_ZERO_BALANCE_TOKENS',
    hideZeroBalanceTokens,
  };
}

export function setLockTime(lockTime) {
  return {
    type: 'SET_LOCK_TIME',
    lockTime,
  };
}

export function setPrimaryCurrency(primaryCurrency) {
  return {
    type: 'SET_PRIMARY_CURRENCY',
    primaryCurrency,
  };
}

export function setUseBlockieIcon(useBlockieIcon) {
  return {
    type: 'SET_USE_BLOCKIE_ICON',
    useBlockieIcon,
  };
}

// Plain action creator for state updates (used during store initialization)
export function setBasicFunctionality(basicFunctionalityEnabled) {
  return {
    type: 'TOGGLE_BASIC_FUNCTIONALITY',
    basicFunctionalityEnabled,
  };
}

// Thunk action creator for user-initiated toggles (includes MultichainAccountService integration)
export function toggleBasicFunctionality(basicFunctionalityEnabled) {
  return async (dispatch) => {
    // First dispatch the Redux state update
    dispatch(setBasicFunctionality(basicFunctionalityEnabled));

    // Call MultichainAccountService to update provider states and trigger alignment
    const Engine = require('../../core/Engine').default;
    Engine.context.MultichainAccountService.setBasicFunctionality(
      basicFunctionalityEnabled,
    ).catch((error) => {
      console.error(
        'Failed to set basic functionality on MultichainAccountService:',
        error,
      );
    });
  };
}

export function toggleDeviceNotification(deviceNotificationEnabled) {
  return {
    type: 'TOGGLE_DEVICE_NOTIFICATIONS',
    deviceNotificationEnabled,
  };
}

export function setTokenSortConfig(tokenSortConfig) {
  return {
    type: 'SET_TOKEN_SORT_CONFIG',
    tokenSortConfig,
  };
}

export function setDeepLinkModalDisabled(deepLinkModalDisabled) {
  return {
    type: 'SET_DEEP_LINK_MODAL_DISABLED',
    deepLinkModalDisabled,
  };
}
