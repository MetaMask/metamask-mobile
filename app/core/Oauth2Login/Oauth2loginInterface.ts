import { AuthSessionResult } from 'expo-auth-session';
import { Web3AuthNetwork } from '@metamask/seedless-onboarding-controller';

export type HandleOauth2LoginResult = ({type: 'pending'} | {type: AuthSessionResult['type'], existingUser: boolean} | {type: 'error', error: string});
export enum AuthConnection {
    Google = 'google',
    Apple = 'apple',
  }

export interface LoginHandlerCodeResult {
    authConnection: AuthConnection;
    code: string;
    clientId: string;
    redirectUri?: string;
    codeVerifier?: string;
}

export interface LoginHandlerIdTokenResult {
    authConnection: AuthConnection;
    idToken: string;
    clientId: string;
    redirectUri?: string;
    codeVerifier?: string;
}

export type LoginHandlerResult = LoginHandlerCodeResult | LoginHandlerIdTokenResult;

export type HandleFlowParams = LoginHandlerResult & { web3AuthNetwork : Web3AuthNetwork }

export interface OAuthUserInfo {
    email: string;
    sub: string;
}

export interface AuthResponse {
    id_token: string;
    verifier: string;
    verifier_id: string;
    indexes: Record<string, number>;
    endpoints: Record<string, string>;
    success: boolean;
    message: string;
    jwt_tokens: Record<string, string>;
}

export interface LoginHandler {
    login(): Promise<LoginHandlerResult | undefined>
}

export const AuthConnectionId = 'byoa-server';
export const GroupedAuthConnectionId = 'mm-seedless-onboarding';
