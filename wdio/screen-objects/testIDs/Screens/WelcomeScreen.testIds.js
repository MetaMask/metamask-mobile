export const WELCOME_SCREEN_GET_STARTED_BUTTON_ID =
  'welcome-screen-get-started-button-id';
export const WELCOME_SCREEN_CAROUSEL_CONTAINER_ID =
  'welcome-screen-carousel-container-id';
export const WELCOME_SCREEN_CAROUSEL_TITLE_ID = (number) => {
  switch (number) {
    case 1:
      return '**/XCUIElementTypeOther[`label == "Welcome to MetaMask Trusted by millions, MetaMask is a secure wallet making the world of web3 accessible to all."`]';
    case 2:
      return '**/XCUIElementTypeOther[`label == "Welcome to MetaMask Trusted by millions, MetaMask is a secure wallet making the world of web3 accessible to all. Manage your digital assets Store, spend and send digital assets like tokens, ethereum, unique collectibles."`]';
    case 3:
      return '**/XCUIElementTypeOther[`label == "Welcome to MetaMask Trusted by millions, MetaMask is a secure wallet making the world of web3 accessible to all. Manage your digital assets Store, spend and send digital assets like tokens, ethereum, unique collectibles. Your gateway to web3 Login with MetaMask and make transactions to invest, earn, play games, sell and more!"`]';
  }
};
