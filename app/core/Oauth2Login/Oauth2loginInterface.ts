import { AuthSessionResult } from 'expo-auth-session';
import { ACTIONS , PREFIXES } from '../../constants/deeplinks';


// to be get from enviroment variable
export const ByoaServerUrl = 'https://api-develop-torus-byoa.web3auth.io';
export const DefaultWeb3AuthNetwork = 'sapphire_devnet';
export const AppRedirectUri = `${PREFIXES.METAMASK}${ACTIONS.OAUTH2_REDIRECT}`;

export const IosGID = '882363291751-nbbp9n0o307cfil1lup766g1s99k0932.apps.googleusercontent.com';
export const IosGoogleRedirectUri = 'com.googleusercontent.apps.882363291751-nbbp9n0o307cfil1lup766g1s99k0932:/oauth2redirect/google';

export const AndroidGoogleWebGID = '882363291751-2a37cchrq9oc1lfj1p419otvahnbhguv.apps.googleusercontent.com';
export const AppleServerRedirectUri = `${ByoaServerUrl}/api/v1/oauth/callback`;
export const AppleWebClientId = 'com.web3auth.appleloginextension';



export type HandleOauth2LoginResult = ({type: 'pending'} | {type: AuthSessionResult['type'], existingUser: boolean} | {type: 'error', error: string});
export type LoginProvider = 'apple' | 'google';
export type Web3AuthNetwork = 'sapphire_devnet' | 'sapphire_mainnet';

export interface HandleFlowParams {
    provider: LoginProvider;
    code?: string;
    idToken?: string;
    clientId: string;
    redirectUri?: string;
    codeVerifier?: string;
}

export interface ByoaResponse {
    id_token: string;
    verifier: string;
    verifier_id: string;
    indexes: Record<string, number>;
    endpoints: Record<string, string>;
    success: boolean;
    message: string;
    jwt_tokens: Record<string, string>;
}


export const AuthConnectionId = 'byoa-server';

export const GroupedAuthConnectionId = 'mm-seedless-onboarding';
