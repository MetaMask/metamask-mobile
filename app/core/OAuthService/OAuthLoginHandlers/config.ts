interface OAUTH_CONFIG_TYPE {
  AUTH_SERVER_URL: string;
  WEB3AUTH_NETWORK: string;

  GOOGLE_GROUPED_AUTH_CONNECTION_ID: string;
  APPLE_GROUPED_AUTH_CONNECTION_ID: string;
  ANDROID_GOOGLE_AUTH_CONNECTION_ID: string;
  ANDROID_APPLE_AUTH_CONNECTION_ID: string;
  IOS_GOOGLE_AUTH_CONNECTION_ID: string;
  IOS_APPLE_AUTH_CONNECTION_ID: string;
}

enum BUILD_TYPE {
  development = 'development',
  main_prod = 'main_prod',
  main_uat = 'main_uat',
  main_dev = 'main_dev',
  flask_prod = 'flask_prod',
  flask_uat = 'flask_uat',
  flask_dev = 'flask_dev',
}

export const OAUTH_CONFIG: Record<BUILD_TYPE, OAUTH_CONFIG_TYPE> = {
  development: {
    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-seedless-onboarding',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-seedless-onboarding',
    AUTH_SERVER_URL: 'https://api-develop-torus-byoa.web3auth.io',
    WEB3AUTH_NETWORK: 'sapphire_devnet',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'byoa-server',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'byoa-server',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'byoa-server',
    IOS_APPLE_AUTH_CONNECTION_ID: 'byoa-server',
  },
  main_prod: {
    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-main',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-main',
    AUTH_SERVER_URL: 'https://auth-service.api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_mainnet',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-main-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-main-common',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-main-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-main-common',
  },
  main_uat: {
    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-uat',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-uat',
    AUTH_SERVER_URL: 'https://auth-service.uat-api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_mainnet',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-uat-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-uat-common',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-uat-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-uat-common',
  },
  main_dev: {
    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-dev',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-dev',
    AUTH_SERVER_URL: 'https://auth-service.dev-api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_devnet',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-dev-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-dev-common',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-dev-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-dev-common',
  },
  flask_prod: {
    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-flask-main',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-flask-main',
    AUTH_SERVER_URL: 'https://auth-service.api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_mainnet',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-main-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-main-common',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-main-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-main-common',
  },
  flask_uat: {
    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-flask-uat',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-flask-uat',
    AUTH_SERVER_URL: 'https://auth-service.api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_mainnet',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-uat-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-uat-common',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-uat-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-uat-common',
  },
  flask_dev: {
    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-flask-dev',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-flask-dev',
    AUTH_SERVER_URL: 'https://auth-service.dev-api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_devnet',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-dev-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-dev-common',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-dev-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-dev-common',
  },
};
