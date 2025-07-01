import { getBundleId } from 'react-native-device-info';

interface OAUTH_CONFIG_TYPE {
  ANDROID_APPLE_CLIENT_ID: string;
  ANDROID_GOOGLE_CLIENT_ID: string;
  ANDROID_GOOGLE_SERVER_CLIENT_ID: string;
  IOS_APPLE_CLIENT_ID: string;
  IOS_GOOGLE_CLIENT_ID: string;
  IOS_GOOGLE_REDIRECT_URI: string;

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
    ANDROID_APPLE_CLIENT_ID: 'com.web3auth.appleloginextension',
    ANDROID_GOOGLE_CLIENT_ID:
      '882363291751-2a37cchrq9oc1lfj1p419otvahnbhguv.apps.googleusercontent.com',
    ANDROID_GOOGLE_SERVER_CLIENT_ID:
      '882363291751-2a37cchrq9oc1lfj1p419otvahnbhguv.apps.googleusercontent.com',
    IOS_APPLE_CLIENT_ID: getBundleId ? getBundleId() : 'io.metamask.MetaMask',
    IOS_GOOGLE_CLIENT_ID:
      '882363291751-nbbp9n0o307cfil1lup766g1s99k0932.apps.googleusercontent.com',
    IOS_GOOGLE_REDIRECT_URI:
      'com.googleusercontent.apps.882363291751-nbbp9n0o307cfil1lup766g1s99k0932:/oauth2redirect/google',

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
    ANDROID_APPLE_CLIENT_ID: 'io.metamask.appleloginclient.prod',
    ANDROID_GOOGLE_CLIENT_ID:
      '795351133007-jcaor637tblrlpuj29shdej3co8bu8kv.apps.googleusercontent.com',
    ANDROID_GOOGLE_SERVER_CLIENT_ID:
      '795351133007-6d0s31utj13knv440fgjo2ur93241gb6.apps.googleusercontent.com',
    IOS_APPLE_CLIENT_ID: getBundleId ? getBundleId() : 'io.metamask.MetaMask',
    IOS_GOOGLE_CLIENT_ID:
      '795351133007-47aohp9j9n7r8fef5n6ejeauhu4kfc9e.apps.googleusercontent.com',
    IOS_GOOGLE_REDIRECT_URI:
      'com.googleusercontent.apps.795351133007-47aohp9j9n7r8fef5n6ejeauhu4kfc9e:/oauth2redirect/google',

    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-main',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-main',
    AUTH_SERVER_URL: 'https://auth-service.api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_mainnet',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-main-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-main-android',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-main-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-main-ios',
  },
  main_uat: {
    ANDROID_APPLE_CLIENT_ID: 'io.metamask.appleloginclient.uat',
    ANDROID_GOOGLE_CLIENT_ID:
      '387141446914-7rl5s9s1uv82fgb03f93eqc0n8jq7t6k.apps.googleusercontent.com',
    ANDROID_GOOGLE_SERVER_CLIENT_ID:
      '387141446914-olajr83p1bbvabh1u8tfglt1k4u6jlcb.apps.googleusercontent.com',
    IOS_APPLE_CLIENT_ID: getBundleId ? getBundleId() : 'io.metamask.MetaMask',
    IOS_GOOGLE_CLIENT_ID:
      '387141446914-5ja3p4dfanfkm8uq238fm1b8t1rkscv4.apps.googleusercontent.com',
    IOS_GOOGLE_REDIRECT_URI:
      'com.googleusercontent.apps.387141446914-5ja3p4dfanfkm8uq238fm1b8t1rkscv4:/oauth2redirect/google',

    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-uat',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-uat',
    AUTH_SERVER_URL: 'https://auth-service.uat-api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_mainnet',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-uat-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-uat-android',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-uat-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-uat-ios',
  },
  main_dev: {
    ANDROID_APPLE_CLIENT_ID: 'io.metamask.appleloginclient.dev',
    ANDROID_GOOGLE_CLIENT_ID:
      '615965109465-laapla9g0klg2p7rp5mn66fcl6jc4fes.apps.googleusercontent.com',
    ANDROID_GOOGLE_SERVER_CLIENT_ID:
      '615965109465-i8oeh9kuvl1n6lk1ffkobpvth27bmi41.apps.googleusercontent.com',
    IOS_APPLE_CLIENT_ID: getBundleId ? getBundleId() : 'io.metamask.MetaMask',
    IOS_GOOGLE_CLIENT_ID:
      '615965109465-h6tp2h3crls6hbggispcgovbvk4vabu3.apps.googleusercontent.com',
    IOS_GOOGLE_REDIRECT_URI:
      'com.googleusercontent.apps.615965109465-h6tp2h3crls6hbggispcgovbvk4vabu3:/oauth2redirect/google',

    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-dev',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-dev',
    AUTH_SERVER_URL: 'https://auth-service.dev-api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_devnet',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-dev-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-dev-android',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-dev-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-dev-ios',
  },
  flask_prod: {
    ANDROID_APPLE_CLIENT_ID: 'io.metamask.appleloginclient.flask.prod',
    ANDROID_GOOGLE_CLIENT_ID:
      '795351133007-0po6dfbepae7klaso18qv61f86u4a2ef.apps.googleusercontent.com',
    ANDROID_GOOGLE_SERVER_CLIENT_ID:
      '795351133007-gh67d3hot6ib24htu9d7sh01bg90lpdu.apps.googleusercontent.com',
    IOS_APPLE_CLIENT_ID: getBundleId
      ? getBundleId()
      : 'io.metamask.MetaMask-Flask',
    IOS_GOOGLE_CLIENT_ID:
      '795351133007-gvuagr9t7tfkak3sp2cmng4pdhchlfpd.apps.googleusercontent.com',
    IOS_GOOGLE_REDIRECT_URI:
      'com.googleusercontent.apps.795351133007-gvuagr9t7tfkak3sp2cmng4pdhchlfpd:/oauth2redirect/google',

    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-flask-main',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-flask-main',
    AUTH_SERVER_URL: 'https://auth-service.api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_mainnet',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-main-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-main-android',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-main-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-main-ios',
  },
  flask_uat: {
    ANDROID_APPLE_CLIENT_ID: 'io.metamask.appleloginclient.flask.uat',
    ANDROID_GOOGLE_CLIENT_ID:
      '387141446914-f03k9ivc2jrmi1s53lne88mh529372kj.apps.googleusercontent.com',
    ANDROID_GOOGLE_SERVER_CLIENT_ID:
      '387141446914-f03k9ivc2jrmi1s53lne88mh529372kj.apps.googleusercontent.com',
    IOS_APPLE_CLIENT_ID: getBundleId
      ? getBundleId()
      : 'io.metamask.MetaMask-Flask',
    IOS_GOOGLE_CLIENT_ID:
      '387141446914-1tdlsrare1jtjd2tgal9bi1ilb4qro5d.apps.googleusercontent.com',
    IOS_GOOGLE_REDIRECT_URI:
      'com.googleusercontent.apps.387141446914-1tdlsrare1jtjd2tgal9bi1ilb4qro5d:/oauth2redirect/google',

    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-flask-uat',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-flask-uat',
    AUTH_SERVER_URL: 'https://auth-service.api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_mainnet',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-uat-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-uat-android',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-uat-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-uat-ios',
  },
  flask_dev: {
    ANDROID_APPLE_CLIENT_ID: 'io.metamask.appleloginclient.flask.dev',
    ANDROID_GOOGLE_CLIENT_ID:
      '615965109465-9nn2i74feqs3v9ps4lb61ha0v34eo382.apps.googleusercontent.com',
    ANDROID_GOOGLE_SERVER_CLIENT_ID:
      '615965109465-ab20kuqbls6fj5s50fvmvbnket8nv1sh.apps.googleusercontent.com',
    IOS_APPLE_CLIENT_ID: getBundleId
      ? getBundleId()
      : 'io.metamask.MetaMask-Flask',
    IOS_GOOGLE_CLIENT_ID:
      '615965109465-89b2lmqgm5ka8j8t403qhooouv57id9b.apps.googleusercontent.com',
    IOS_GOOGLE_REDIRECT_URI:
      'com.googleusercontent.apps.615965109465-89b2lmqgm5ka8j8t403qhooouv57id9b:/oauth2redirect/google',

    GOOGLE_GROUPED_AUTH_CONNECTION_ID: 'mm-google-flask-dev',
    APPLE_GROUPED_AUTH_CONNECTION_ID: 'mm-apple-flask-dev',
    AUTH_SERVER_URL: 'https://auth-service.dev-api.cx.metamask.io',
    WEB3AUTH_NETWORK: 'sapphire_devnet',

    ANDROID_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-dev-android',
    ANDROID_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-dev-android',
    IOS_GOOGLE_AUTH_CONNECTION_ID: 'mm-google-flask-dev-ios',
    IOS_APPLE_AUTH_CONNECTION_ID: 'mm-apple-flask-dev-ios',
  },
};
