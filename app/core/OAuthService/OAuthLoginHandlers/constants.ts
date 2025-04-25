import { PREFIXES, ACTIONS } from '../../../constants/deeplinks';

// // to get from environment variable
// export const AuthServerUrl = process.env.AUTH_SERVER_URL;
export const AppRedirectUri = `${PREFIXES.METAMASK}${ACTIONS.OAUTH2_REDIRECT}`;

// // bundle id
// export const IosAppleClientId = process.env.IOS_APPLE_CLIENT_ID;

// export const IosGID = process.env.IOS_GOOGLE_CLIENT_ID;
// export const IosGoogleRedirectUri = process.env.IOS_GOOGLE_REDIRECT_URI;

// export const AndroidGoogleWebGID = process.env.ANDROID_WEB_GOOGLE_CLIENT_ID;
// export const AppleWebClientId = process.env.ANDROID_WEB_APPLE_CLIENT_ID;

// export const AppleServerRedirectUri = `${AuthServerUrl}/api/v1/oauth/callback`;

// export const AuthConnectionId = process.env.AUTH_CONNECTION_ID;
// export const GroupedAuthConnectionId = process.env.GROUPED_AUTH_CONNECTION_ID;


export const web3AuthNetwork = 'sapphire_devnet';
export const AuthServerUrl = 'https://api-develop-torus-byoa.web3auth.io';

export const IosGID = '882363291751-nbbp9n0o307cfil1lup766g1s99k0932.apps.googleusercontent.com';
export const IosGoogleRedirectUri = 'com.googleusercontent.apps.882363291751-nbbp9n0o307cfil1lup766g1s99k0932:/oauth2redirect/google';
export const IosAppleClientId = 'io.metamask.MetaMask';

export const AndroidGoogleWebGID = '882363291751-2a37cchrq9oc1lfj1p419otvahnbhguv.apps.googleusercontent.com';
export const AppleWebClientId = 'com.web3auth.appleloginextension';

export const AuthConnectionId = 'byoa-server';
export const GroupedAuthConnectionId = 'mm-seedless-onboarding';

export const AppleServerRedirectUri = `${AuthServerUrl}/api/v1/oauth/callback`;

export const getAllEnvVariables = () => ({
        authServerUrl : process.env.AUTH_SERVER_URL,
        appRedirectUri : `${PREFIXES.METAMASK}${ACTIONS.OAUTH2_REDIRECT}`,
        iosAppleClientId : process.env.IOS_APPLE_CLIENT_ID,
        iosGID : process.env.IOS_GOOGLE_CLIENT_ID,
        iosGoogleRedirectUri : process.env.IOS_GOOGLE_REDIRECT_URI,
        androidGoogleWebGID : process.env.ANDROID_WEB_GOOGLE_CLIENT_ID,
        appleWebClientId : process.env.ANDROID_WEB_APPLE_CLIENT_ID,
        appleServerRedirectUri : `${AuthServerUrl}/api/v1/oauth/callback`,
        authConnectionId : process.env.AUTH_CONNECTION_ID,
        groupedAuthConnectionId : process.env.GROUPED_AUTH_CONNECTION_ID,
        web3AuthNetwork : process.env.Web3AuthNetwork,
    });
