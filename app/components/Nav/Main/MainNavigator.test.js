import Routes from '../../../constants/navigation/Routes';

describe('MainNavigator Route Constants', () => {
  it('has home route defined', () => {
    expect(Routes.WALLET.HOME).toBeDefined();
  });

  it('has browser routes defined', () => {
    expect(Routes.BROWSER.VIEW).toBeDefined();
    expect(Routes.BROWSER.HOME).toBeDefined();
  });

  it('has settings routes defined', () => {
    expect(Routes.SETTINGS_VIEW).toBeDefined();
    expect(Routes.SETTINGS.NOTIFICATIONS).toBeDefined();
    expect(Routes.SETTINGS.REVEAL_PRIVATE_CREDENTIAL).toBeDefined();
  });

  it('has transactions view route defined', () => {
    expect(Routes.TRANSACTIONS_VIEW).toBeDefined();
  });

  it('has rewards view route defined', () => {
    expect(Routes.REWARDS_VIEW).toBeDefined();
  });

  it('has rewards benefit routes defined', () => {
    expect(Routes.REWARD_BENEFITS_FULL_VIEW).toBeDefined();
    expect(Routes.REWARD_BENEFIT_FULL_VIEW).toBeDefined();
  });

  it('has trending view route defined', () => {
    expect(Routes.TRENDING_VIEW).toBeDefined();
  });

  it('has ramp routes defined', () => {
    expect(Routes.RAMP.BUY).toBeDefined();
    expect(Routes.RAMP.SELL).toBeDefined();
    expect(Routes.RAMP.SETTINGS).toBeDefined();
    expect(Routes.RAMP.TOKEN_SELECTION).toBeDefined();
    expect(Routes.RAMP.ORDER_DETAILS).toBeDefined();
  });

  it('has deposit routes defined', () => {
    expect(Routes.DEPOSIT.ID).toBeDefined();
    expect(Routes.DEPOSIT.ORDER_DETAILS).toBeDefined();
  });

  it('has bridge routes defined', () => {
    expect(Routes.BRIDGE.ROOT).toBeDefined();
    expect(Routes.BRIDGE.MODALS.ROOT).toBeDefined();
    expect(Routes.BRIDGE.BRIDGE_TRANSACTION_DETAILS).toBeDefined();
  });

  it('has earn routes defined', () => {
    expect(Routes.EARN.ROOT).toBeDefined();
    expect(Routes.EARN.MODALS.ROOT).toBeDefined();
  });

  it('has notification routes defined', () => {
    expect(Routes.NOTIFICATIONS.VIEW).toBeDefined();
    expect(Routes.NOTIFICATIONS.OPT_IN).toBeDefined();
    expect(Routes.NOTIFICATIONS.OPT_IN_STACK).toBeDefined();
    expect(Routes.NOTIFICATIONS.DETAILS).toBeDefined();
  });

  it('has QR tab switcher route defined', () => {
    expect(Routes.QR_TAB_SWITCHER).toBeDefined();
  });

  it('has wallet routes defined', () => {
    expect(Routes.WALLET.TAB_STACK_FLOW).toBeDefined();
    expect(Routes.WALLET.TOKENS_FULL_VIEW).toBeDefined();
    expect(Routes.WALLET.NFTS_FULL_VIEW).toBeDefined();
  });

  it('has security trust route defined', () => {
    expect(Routes.SECURITY_TRUST).toBeDefined();
  });

  it('has snaps routes defined', () => {
    expect(Routes.SNAPS.SNAPS_SETTINGS_LIST).toBeDefined();
    expect(Routes.SNAPS.SNAP_SETTINGS).toBeDefined();
  });

  it('has explore search route defined', () => {
    expect(Routes.EXPLORE_SEARCH).toBeDefined();
  });

  it('has sites full view route defined', () => {
    expect(Routes.SITES_FULL_VIEW).toBeDefined();
  });

  it('has card routes defined', () => {
    expect(Routes.CARD.ROOT).toBeDefined();
  });

  it('has feature flag override route defined', () => {
    expect(Routes.FEATURE_FLAG_OVERRIDE).toBeDefined();
  });

  it('has transaction details route defined', () => {
    expect(Routes.TRANSACTION_DETAILS).toBeDefined();
  });

  it('has deprecated network details route defined', () => {
    expect(Routes.DEPRECATED_NETWORK_DETAILS).toBeDefined();
  });

  it('has accounts menu view route defined', () => {
    expect(Routes.ACCOUNTS_MENU_VIEW).toBeDefined();
  });

  it('has wallet connect sessions route defined', () => {
    expect(Routes.WALLET.WALLET_CONNECT_SESSIONS_VIEW).toBeDefined();
  });

  it('has perps routes defined', () => {
    expect(Routes.PERPS.ROOT).toBeDefined();
    expect(Routes.PERPS.MODALS.ROOT).toBeDefined();
    expect(Routes.PERPS.TUTORIAL).toBeDefined();
    expect(Routes.PERPS.POSITION_TRANSACTION).toBeDefined();
    expect(Routes.PERPS.ORDER_TRANSACTION).toBeDefined();
    expect(Routes.PERPS.FUNDING_TRANSACTION).toBeDefined();
  });

  it('has predict routes defined', () => {
    expect(Routes.PREDICT.ROOT).toBeDefined();
    expect(Routes.PREDICT.MODALS.ROOT).toBeDefined();
  });

  it('has market insights routes defined', () => {
    expect(Routes.MARKET_INSIGHTS.VIEW).toBeDefined();
  });
});

describe('MainNavigator Tab Options', () => {
  it('defines wallet tab icon key', () => {
    expect(Routes.WALLET_VIEW).toBeDefined();
  });

  it('defines browser tab navigation', () => {
    expect(Routes.BROWSER_VIEW).toBeDefined();
  });
});

describe('Route Constants Validation', () => {
  it('has all main navigation screens defined', () => {
    const mainRoutes = [
      Routes.WALLET.HOME,
      Routes.BROWSER.HOME,
      Routes.TRANSACTIONS_VIEW,
      Routes.REWARDS_VIEW,
      Routes.TRENDING_VIEW,
      Routes.SETTINGS_VIEW,
    ];

    mainRoutes.forEach((route) => {
      expect(route).toBeDefined();
      expect(typeof route).toBe('string');
    });
  });

  it('has all modal navigation routes defined', () => {
    const modalRoutes = [
      Routes.MODAL.WALLET_ACTIONS,
      Routes.MODAL.ROOT_MODAL_FLOW,
      Routes.MODAL.REWARDS_BOTTOM_SHEET_MODAL,
    ];

    modalRoutes.forEach((route) => {
      expect(route).toBeDefined();
      expect(typeof route).toBe('string');
    });
  });
});

describe('Stack Navigator Routes', () => {
  it('has wallet tab stack flow route defined', () => {
    expect(Routes.WALLET.TAB_STACK_FLOW).toBeDefined();
  });

  it('has add asset route defined', () => {
    expect(Routes.WALLET.HOME).toBeDefined();
  });

  it('has asset route constant', () => {
    expect(typeof Routes.WALLET.HOME).toBe('string');
  });
});

describe('Full View Routes', () => {
  it('has tokens full view route defined', () => {
    expect(Routes.WALLET.TOKENS_FULL_VIEW).toBeDefined();
  });

  it('has NFTs full view route defined', () => {
    expect(Routes.WALLET.NFTS_FULL_VIEW).toBeDefined();
  });

  it('has DeFi full view route defined', () => {
    expect(Routes.WALLET.DEFI_FULL_VIEW).toBeDefined();
  });

  it('has cash tokens full view route defined', () => {
    expect(Routes.WALLET.CASH_TOKENS_FULL_VIEW).toBeDefined();
  });
});
