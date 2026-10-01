import CryptoKit
import Foundation
import Security

struct BaanxLoginSession {
    var initiateToken: String
    var state: String
    var codeVerifier: String
    var userId: String?
    var loginAccessToken: String?
}

enum BaanxLoginClient {
    static let redirectURI = "https://example.com"

    static func start(baseURL: URL, clientKey: String, http: ProviderHTTP) async throws -> BaanxLoginSession {
        let verifier = randomPKCE(length: 64)
        let challenge = codeChallenge(verifier)
        let state = randomPKCE(length: 32)
        var components = URLComponents(url: joined(baseURL, "v1/auth/oauth/authorize/initiate"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "client_id", value: clientKey),
            URLQueryItem(name: "client_secret", value: clientKey),
            URLQueryItem(name: "state", value: state),
            URLQueryItem(name: "code_challenge", value: challenge),
            URLQueryItem(name: "code_challenge_method", value: "S256"),
            URLQueryItem(name: "mode", value: "api"),
            URLQueryItem(name: "response_type", value: "code"),
            URLQueryItem(name: "redirect_uri", value: redirectURI),
        ]
        guard let url = components?.url else { throw ProviderClientError.invalidResponse }
        let data = try await http.send(
            url: url,
            method: "GET",
            headers: [
                "x-client-key": clientKey,
                "x-us-env": "true",
            ]
        )
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let token = json?["token"] as? String else { throw ProviderClientError.invalidResponse }
        return BaanxLoginSession(initiateToken: token, state: state, codeVerifier: verifier)
    }

    static func submit(
        session: inout BaanxLoginSession,
        email: String,
        password: String,
        otpCode: String?,
        baseURL: URL,
        clientKey: String,
        http: ProviderHTTP
    ) async throws -> Bool {
        var body: [String: String] = ["email": email, "password": password]
        if let otpCode, !otpCode.isEmpty { body["otpCode"] = otpCode }
        let data = try await http.send(
            url: joined(baseURL, "v1/auth/login"),
            method: "POST",
            headers: [
                "Content-Type": "application/json",
                "x-client-key": clientKey,
                "x-us-env": "true",
            ],
            body: try JSONSerialization.data(withJSONObject: body)
        )
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        if json?["isOtpRequired"] as? Bool == true {
            session.userId = json?["userId"] as? String
            return false
        }
        guard let access = json?["accessToken"] as? String, let userId = json?["userId"] as? String else {
            throw ProviderClientError.invalidResponse
        }
        session.loginAccessToken = access
        session.userId = userId
        return true
    }

    static func sendOTP(userId: String, baseURL: URL, clientKey: String, http: ProviderHTTP) async throws {
        let body = ["userId": userId]
        _ = try await http.send(
            url: joined(baseURL, "v1/auth/login/otp"),
            method: "POST",
            headers: [
                "Content-Type": "application/json",
                "x-client-key": clientKey,
                "x-us-env": "true",
            ],
            body: try JSONSerialization.data(withJSONObject: body)
        )
    }

    static func exchange(
        session: BaanxLoginSession,
        baseURL: URL,
        clientKey: String,
        http: ProviderHTTP
    ) async throws -> CardTokenSet {
        guard let loginAccess = session.loginAccessToken else { throw ProviderClientError.invalidResponse }
        let authorizeData = try await http.send(
            url: joined(baseURL, "v1/auth/oauth/authorize"),
            method: "POST",
            headers: [
                "Content-Type": "application/json",
                "Authorization": "Bearer \(loginAccess)",
                "x-client-key": clientKey,
                "x-us-env": "true",
            ],
            body: try JSONSerialization.data(withJSONObject: ["token": session.initiateToken])
        )
        let authorize = try JSONSerialization.jsonObject(with: authorizeData) as? [String: Any]
        guard
            let code = authorize?["code"] as? String,
            authorize?["state"] as? String == session.state
        else {
            throw ProviderClientError.invalidResponse
        }
        let tokenBody: [String: String] = [
            "grant_type": "authorization_code",
            "code": code,
            "code_verifier": session.codeVerifier,
            "redirect_uri": redirectURI,
        ]
        let tokenData = try await http.send(
            url: joined(baseURL, "v1/auth/oauth/token"),
            method: "POST",
            headers: [
                "Content-Type": "application/json",
                "x-client-key": clientKey,
                "x-secret-key": clientKey,
                "x-us-env": "true",
            ],
            body: try JSONSerialization.data(withJSONObject: tokenBody)
        )
        let json = try JSONSerialization.jsonObject(with: tokenData) as? [String: Any]
        guard
            let access = json?["access_token"] as? String,
            let refresh = json?["refresh_token"] as? String,
            let expires = json?["expires_in"] as? Double
        else {
            throw ProviderClientError.invalidResponse
        }
        let now = Date().timeIntervalSince1970 * 1000
        let refreshExpires = json?["refresh_token_expires_in"] as? Double
        return CardTokenSet(
            accessToken: access,
            refreshToken: refresh,
            accessTokenExpiresAt: now + expires * 1000,
            refreshTokenExpiresAt: refreshExpires.map { now + $0 * 1000 },
            location: "us",
            providerUserId: session.userId
        )
    }

    private static func randomPKCE(length: Int) -> String {
        let alphabet = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
        var bytes = [UInt8](repeating: 0, count: length)
        _ = SecRandomCopyBytes(kSecRandomDefault, length, &bytes)
        return String(bytes.map { alphabet[Int($0) % alphabet.count] })
    }

    private static func codeChallenge(_ verifier: String) -> String {
        let digest = SHA256.hash(data: Data(verifier.utf8))
        return Data(digest).base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
