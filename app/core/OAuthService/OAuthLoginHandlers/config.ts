import { Env as ProfileSyncEnv } from '@metamask/profile-sync-controller/sdk';
interface OAUTH_CONFIG_TYPE {
  IOS_GOOGLE_CLIENT_ID: string;
  IOS_GOOGLE_REDIRECT_URI: string;
  ANDROID_GOOGLE_CLIENT_ID: string;
  ANDROID_GOOGLE_SERVER_CLIENT_ID: string;
  ANDROID_APPLE_CLIENT_ID: string;

  /** CX authentication service */
  AUTHENTICATION_SERVER_URL: string;
  W3A_AUTH_SERVER: string;
  WEB3AUTH_NETWORK: string;

  PROFILE_SYNC_ENV: string;

  /** Telegram OIDC client identifier (BotFather Web Login) */
  TELEGRAM_CLIENT_ID: string;

  GOOGLE_GROUPED_AUTH_CONNECTION_ID: string;
  APPLE_GROUPED_AUTH_CONNECTION_ID: string;
  TELEGRAM_GROUPED_AUTH_CONNECTION_ID: string;
  ANDROID_GOOGLE_AUTH_CONNECTION_ID: string;
  ANDROID_APPLE_AUTH_CONNECTION_ID: string;
  ANDROID_TELEGRAM_AUTH_CONNECTION_ID: string;
  IOS_GOOGLE_AUTH_CONNECTION_ID: string;
  IOS_APPLE_AUTH_CONNECTION_ID: string;
  IOS_TELEGRAM_AUTH_CONNECTION_ID: string;
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
    IOS_GOOGLE_CLIENT_ID:
      '615965109465-h6tp2h3crls6hbggispcgovbvk4vabu3.apps.googleusercontent.com',
    IOS_GOOGLE_REDIRECT_URI:
      'com.googleusercontent.apps.615965109465-h6tp2h3crls6hbggispcgovbvk4vabu3:/oauth2redirect/google',
    ANDROID_GOOGLE_CLIENT_ID:
      '615965109465-laapla9g0klg2p7rp5mn66fcl6jc4fes.apps.googleusercontent.com',
    ANDROID_GOOGLE_SERVER_CLIENT_ID:
      '615965109465-i8oeh9kuvl1n6lk1ffkobpvth27bmi41.apps.googleusercontent.com',
    ANDROID_APPLE_CLIENT_ID: 'io.metamask.appleloginclient.dev',

    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-seedless-onboarding',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-seedless-onboarding',
    TELEGRAM_GROUPED_AUTH_CONNECTION_ID: 'mm-seedless-onboarding',
    AUTHENTICATION_SERVER_URL: 'https://authentication.dev-api.cx.metamask.io',
    W3A_AUTH_SERVER: 'https://auth-service.dev-api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_devnet',
    PROFILE_SYNC_ENV: ProfileSyncEnv.DEV,
    TELEGRAM_CLIENT_ID: '8648706996',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'byoa-server',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'byoa-server',
    ANDROID_TELEGRAM_AUTH_CONNECTION_ID: 'byoa-server',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'byoa-server',
    IOS_APPLE_AUTH_CONNECTION_ID: 'byoa-server',
    IOS_TELEGRAM_AUTH_CONNECTION_ID: 'byoa-server',
  },
  main_prod: {
    IOS_GOOGLE_CLIENT_ID:
      '795351133007-47aohp9j9n7r8fef5n6ejeauhu4kfc9e.apps.googleusercontent.com',
    IOS_GOOGLE_REDIRECT_URI:
      'com.googleusercontent.apps.795351133007-47aohp9j9n7r8fef5n6ejeauhu4kfc9e:/oauth2redirect/google',
    ANDROID_GOOGLE_CLIENT_ID:
      '795351133007-jcaor637tblrlpuj29shdej3co8bu8kv.apps.googleusercontent.com',
    ANDROID_GOOGLE_SERVER_CLIENT_ID:
      '795351133007-6d0s31utj13knv440fgjo2ur93241gb6.apps.googleusercontent.com',
    ANDROID_APPLE_CLIENT_ID: 'io.metamask.appleloginclient.prod',

    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-main',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-main',
    TELEGRAM_GROUPED_AUTH_CONNECTION_ID: 'mm-telegram-main',
    AUTHENTICATION_SERVER_URL: 'https://authentication.api.cx.metamask.io',
    W3A_AUTH_SERVER: 'https://auth-service.api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_mainnet',
    PROFILE_SYNC_ENV: ProfileSyncEnv.PRD,
    TELEGRAM_CLIENT_ID: '8775377623',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-main-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-main-common',
    ANDROID_TELEGRAM_AUTH_CONNECTION_ID: 'mm-telegram-main-common',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-main-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-main-common',
    IOS_TELEGRAM_AUTH_CONNECTION_ID: 'mm-telegram-main-common',
  },
  main_uat: {
    IOS_GOOGLE_CLIENT_ID:
      '387141446914-5ja3p4dfanfkm8uq238fm1b8t1rkscv4.apps.googleusercontent.com',
    IOS_GOOGLE_REDIRECT_URI:
      'com.googleusercontent.apps.387141446914-5ja3p4dfanfkm8uq238fm1b8t1rkscv4:/oauth2redirect/google',
    ANDROID_GOOGLE_CLIENT_ID:
      '387141446914-7rl5s9s1uv82fgb03f93eqc0n8jq7t6k.apps.googleusercontent.com',
    ANDROID_GOOGLE_SERVER_CLIENT_ID:
      '387141446914-olajr83p1bbvabh1u8tfglt1k4u6jlcb.apps.googleusercontent.com',
    ANDROID_APPLE_CLIENT_ID: 'io.metamask.appleloginclient.uat',

    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-uat',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-uat',
    TELEGRAM_GROUPED_AUTH_CONNECTION_ID: 'mm-telegram-uat',
    AUTHENTICATION_SERVER_URL: 'https://authentication.uat-api.cx.metamask.io',
    W3A_AUTH_SERVER: 'https://auth-service.uat-api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_mainnet',
    PROFILE_SYNC_ENV: ProfileSyncEnv.UAT,
    TELEGRAM_CLIENT_ID: '8645620447',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-uat-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-uat-common',
    ANDROID_TELEGRAM_AUTH_CONNECTION_ID: 'mm-telegram-uat-common',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-uat-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-uat-common',
    IOS_TELEGRAM_AUTH_CONNECTION_ID: 'mm-telegram-uat-common',
  },
  main_dev: {
    IOS_GOOGLE_CLIENT_ID:
      '615965109465-h6tp2h3crls6hbggispcgovbvk4vabu3.apps.googleusercontent.com',
    IOS_GOOGLE_REDIRECT_URI:
      'com.googleusercontent.apps.615965109465-h6tp2h3crls6hbggispcgovbvk4vabu3:/oauth2redirect/google',
    ANDROID_GOOGLE_CLIENT_ID:
      '615965109465-laapla9g0klg2p7rp5mn66fcl6jc4fes.apps.googleusercontent.com',
    ANDROID_GOOGLE_SERVER_CLIENT_ID:
      '615965109465-i8oeh9kuvl1n6lk1ffkobpvth27bmi41.apps.googleusercontent.com',
    ANDROID_APPLE_CLIENT_ID: 'io.metamask.appleloginclient.dev',

    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-dev',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-dev',
    TELEGRAM_GROUPED_AUTH_CONNECTION_ID: 'mm-telegram-dev-common',
    AUTHENTICATION_SERVER_URL: 'https://authentication.dev-api.cx.metamask.io',
    W3A_AUTH_SERVER: 'https://auth-service.dev-api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_devnet',
    PROFILE_SYNC_ENV: ProfileSyncEnv.DEV,
    TELEGRAM_CLIENT_ID: '8648706996',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-dev-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-dev-common',
    ANDROID_TELEGRAM_AUTH_CONNECTION_ID: 'mm-telegram-dev-tyler',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-dev-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-dev-common',
    IOS_TELEGRAM_AUTH_CONNECTION_ID: 'mm-telegram-dev-tyler',
  },
  flask_prod: {
    IOS_GOOGLE_CLIENT_ID:
      '795351133007-gvuagr9t7tfkak3sp2cmng4pdhchlfpd.apps.googleusercontent.com',
    IOS_GOOGLE_REDIRECT_URI:
      'com.googleusercontent.apps.795351133007-gvuagr9t7tfkak3sp2cmng4pdhchlfpd:/oauth2redirect/google',
    ANDROID_GOOGLE_CLIENT_ID:
      '795351133007-0po6dfbepae7klaso18qv61f86u4a2ef.apps.googleusercontent.com',
    ANDROID_GOOGLE_SERVER_CLIENT_ID:
      '795351133007-gh67d3hot6ib24htu9d7sh01bg90lpdu.apps.googleusercontent.com',
    ANDROID_APPLE_CLIENT_ID: 'io.metamask.appleloginclient.flask.prod',

    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-flask-main',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-flask-main',
    TELEGRAM_GROUPED_AUTH_CONNECTION_ID: 'mm-telegram-flask-main',
    AUTHENTICATION_SERVER_URL: 'https://authentication.api.cx.metamask.io',
    W3A_AUTH_SERVER: 'https://auth-service.api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_mainnet',
    PROFILE_SYNC_ENV: ProfileSyncEnv.PRD,
    TELEGRAM_CLIENT_ID: '8775377623',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-main-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-main-common',
    ANDROID_TELEGRAM_AUTH_CONNECTION_ID: 'mm-telegram-flask-main-common',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-main-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-main-common',
    IOS_TELEGRAM_AUTH_CONNECTION_ID: 'mm-telegram-flask-main-common',
  },
  flask_uat: {
    IOS_GOOGLE_CLIENT_ID:
      '387141446914-1tdlsrare1jtjd2tgal9bi1ilb4qro5d.apps.googleusercontent.com',
    IOS_GOOGLE_REDIRECT_URI:
      'com.googleusercontent.apps.387141446914-1tdlsrare1jtjd2tgal9bi1ilb4qro5d:/oauth2redirect/google',
    ANDROID_GOOGLE_CLIENT_ID:
      '387141446914-ki5586faf9qmlghop8g07f4a10scdevi.apps.googleusercontent.com',
    ANDROID_GOOGLE_SERVER_CLIENT_ID:
      '387141446914-f03k9ivc2jrmi1s53lne88mh529372kj.apps.googleusercontent.com',
    ANDROID_APPLE_CLIENT_ID: 'io.metamask.appleloginclient.flask.uat',

    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-flask-uat',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-flask-uat',
    TELEGRAM_GROUPED_AUTH_CONNECTION_ID: 'mm-telegram-flask-uat',
    AUTHENTICATION_SERVER_URL: 'https://authentication.uat-api.cx.metamask.io',
    W3A_AUTH_SERVER: 'https://auth-service.api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_mainnet',
    PROFILE_SYNC_ENV: ProfileSyncEnv.UAT,
    TELEGRAM_CLIENT_ID: '8645620447',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-uat-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-uat-common',
    ANDROID_TELEGRAM_AUTH_CONNECTION_ID: 'mm-telegram-flask-uat-common',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-uat-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-uat-common',
    IOS_TELEGRAM_AUTH_CONNECTION_ID: 'mm-telegram-flask-uat-common',
  },
  flask_dev: {
    IOS_GOOGLE_CLIENT_ID:
      '615965109465-89b2lmqgm5ka8j8t403qhooouv57id9b.apps.googleusercontent.com',
    IOS_GOOGLE_REDIRECT_URI:
      'com.googleusercontent.apps.615965109465-89b2lmqgm5ka8j8t403qhooouv57id9b:/oauth2redirect/google',
    ANDROID_GOOGLE_CLIENT_ID:
      '615965109465-9nn2i74feqs3v9ps4lb61ha0v34eo382.apps.googleusercontent.com',
    ANDROID_GOOGLE_SERVER_CLIENT_ID:
      '615965109465-ab20kuqbls6fj5s50fvmvbnket8nv1sh.apps.googleusercontent.com',
    ANDROID_APPLE_CLIENT_ID: 'io.metamask.appleloginclient.flask.dev',

    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-flask-dev',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-flask-dev',
    TELEGRAM_GROUPED_AUTH_CONNECTION_ID: 'mm-telegram-flask-dev',
    AUTHENTICATION_SERVER_URL: 'https://authentication.dev-api.cx.metamask.io',
    W3A_AUTH_SERVER: 'https://auth-service.dev-api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_devnet',
    PROFILE_SYNC_ENV: ProfileSyncEnv.DEV,
    TELEGRAM_CLIENT_ID: '8648706996',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-dev-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-dev-common',
    ANDROID_TELEGRAM_AUTH_CONNECTION_ID: 'mm-telegram-flask-dev-common',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-dev-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-dev-common',
    IOS_TELEGRAM_AUTH_CONNECTION_ID: 'mm-telegram-flask-dev-common',
  },
};
