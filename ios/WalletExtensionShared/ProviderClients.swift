import Foundation

struct ProvisioningPayload: Equatable {
    var encryptedPassData: String
    var activationData: String
    var ephemeralPublicKey: String
}

enum ProviderClientError: Error, Equatable {
    case http(Int, errorCode: String?)
    case invalidResponse
    case timeout
}

func joined(_ base: URL, _ path: String) -> URL {
    let root = base.absoluteString.hasSuffix("/")
        ? String(base.absoluteString.dropLast())
        : base.absoluteString
    let suffix = path.hasPrefix("/") ? path : "/" + path
    return URL(string: root + suffix) ?? base
}

struct ProviderHTTP {
    var session: URLSession = .shared
    var timeout: TimeInterval = 6

    func send(
        url: URL,
        method: String,
        headers: [String: String],
        body: Data? = nil
    ) async throws -> Data {
        var request = URLRequest(url: url, timeoutInterval: timeout)
        request.httpMethod = method
        request.httpBody = body
        headers.forEach { request.setValue($1, forHTTPHeaderField: $0) }
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw ProviderClientError.invalidResponse
        }
        guard (200..<300).contains(http.statusCode) else {
            throw ProviderClientError.http(http.statusCode, errorCode: safeProviderErrorCode(data))
        }
        return data
    }
}

func safeProviderErrorCode(_ data: Data) -> String? {
    guard
        let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
        let code = json["errorCode"] as? String,
        code.range(of: #"\A[A-Z0-9_]{1,64}\z"#, options: .regularExpression) != nil
    else {
        return nil
    }
    return code
}

enum BaanxClient {
    static func refresh(tokens: CardTokenSet, baseURL: URL, clientKey: String, http: ProviderHTTP) async throws -> CardTokenSet {
        guard let refreshToken = tokens.refreshToken else { throw ProviderClientError.invalidResponse }
        let url = joined(baseURL, "v1/auth/oauth/token")
        let body: [String: String] = [
            "grant_type": "refresh_token",
            "refresh_token": refreshToken,
        ]
        let data = try await http.send(
            url: url,
            method: "POST",
            headers: [
                "Content-Type": "application/json",
                "x-client-key": clientKey,
                "x-secret-key": clientKey,
                "x-us-env": "true",
            ],
            body: try JSONSerialization.data(withJSONObject: body)
        )
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard
            let access = json?["access_token"] as? String,
            let refresh = json?["refresh_token"] as? String,
            let expires = json?["expires_in"] as? Double
        else {
            throw ProviderClientError.invalidResponse
        }
        let refreshExpires = json?["refresh_token_expires_in"] as? Double
        let now = Date().timeIntervalSince1970 * 1000
        return CardTokenSet(
            accessToken: access,
            refreshToken: refresh,
            accessTokenExpiresAt: now + expires * 1000,
            refreshTokenExpiresAt: refreshExpires.map { now + $0 * 1000 },
            location: tokens.location,
            providerUserId: tokens.providerUserId,
            cardholderAccountId: tokens.cardholderAccountId,
            accountAddress: tokens.accountAddress,
            keyringId: tokens.keyringId
        )
    }

    static func card(tokens: CardTokenSet, baseURL: URL, clientKey: String, http: ProviderHTTP) async throws -> SnapshotCard? {
        let url = joined(baseURL, "v1/card/status")
        let data = try await http.send(
            url: url,
            method: "GET",
            headers: authHeaders(tokens: tokens, clientKey: clientKey)
        )
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            return nil
        }
        let object = (json["data"] as? [String: Any]) ?? json
        guard
            let cardId = object["id"] as? String,
            let lastFour = (object["panLast4"] as? String) ?? (object["lastFour"] as? String),
            (object["status"] as? String)?.uppercased() == "ACTIVE" || object["status"] == nil
        else {
            return nil
        }
        return makeSnapshotCard(cardId: cardId, lastFour: lastFour, name: object["holderName"] as? String ?? "", identifier: nil, providerIsBaanx: true)
    }

    static func provision(
        certificates: [Data],
        nonce: Data,
        nonceSignature: Data,
        tokens: CardTokenSet,
        baseURL: URL,
        clientKey: String,
        http: ProviderHTTP
    ) async throws -> ProvisioningPayload {
        guard certificates.count >= 2, !nonce.isEmpty, !nonceSignature.isEmpty else {
            throw ProviderClientError.invalidResponse
        }
        let body: [String: String] = [
            "leafCertificate": certificates[0].hexEncodedString(),
            "intermediateCertificate": certificates[1].hexEncodedString(),
            "nonce": nonce.hexEncodedString(),
            "nonceSignature": nonceSignature.hexEncodedString(),
        ]
        let url = joined(baseURL, "v1/card/wallet/provision/apple")
        let data = try await http.send(
            url: url,
            method: "POST",
            headers: authHeaders(tokens: tokens, clientKey: clientKey),
            body: try JSONSerialization.data(withJSONObject: body)
        )
        return try decodeProvisioning(data)
    }

    private static func authHeaders(tokens: CardTokenSet, clientKey: String) -> [String: String] {
        [
            "Content-Type": "application/json",
            "Authorization": "Bearer \(tokens.accessToken)",
            "x-client-key": clientKey,
            "x-us-env": tokens.location == "us" ? "true" : "false",
        ]
    }
}

enum ImmersveClient {
    static func refresh(
        tokens: CardTokenSet,
        baseURL: URL,
        clientApplicationId: String,
        appUrl: String,
        http: ProviderHTTP
    ) async throws -> CardTokenSet {
        guard let refreshToken = tokens.refreshToken else { throw ProviderClientError.invalidResponse }
        let url = joined(baseURL, "auth/token")
        let body: [String: String] = [
            "refreshToken": refreshToken,
            "clientApplicationId": clientApplicationId,
        ]
        let data = try await http.send(
            url: url,
            method: "POST",
            headers: [
                "Content-Type": "application/json",
                "origin": appUrl,
            ],
            body: try JSONSerialization.data(withJSONObject: body)
        )
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let access = json?["accessToken"] as? String else {
            throw ProviderClientError.invalidResponse
        }
        let nextRefresh = (json?["refreshToken"] as? String) ?? refreshToken
        return CardTokenSet(
            accessToken: access,
            refreshToken: nextRefresh,
            accessTokenExpiresAt: jwtExpiryMilliseconds(access) ?? 0,
            refreshTokenExpiresAt: jwtExpiryMilliseconds(nextRefresh),
            location: tokens.location,
            providerUserId: tokens.providerUserId,
            cardholderAccountId: tokens.cardholderAccountId,
            accountAddress: tokens.accountAddress,
            keyringId: tokens.keyringId
        )
    }

    static func cards(
        tokens: CardTokenSet,
        baseURL: URL,
        http: ProviderHTTP
    ) async throws -> [SnapshotCard] {
        guard let accountId = tokens.cardholderAccountId else { return [] }
        let url = joined(baseURL, "api/accounts/\(accountId)/cards")
        var components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        components?.queryItems = [URLQueryItem(name: "excludeExpired", value: "true")]
        let data = try await http.send(
            url: components?.url ?? url,
            method: "GET",
            headers: [
                "Authorization": "Bearer \(tokens.accessToken)",
                "Content-Type": "application/json",
            ]
        )
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        let items = json?["items"] as? [[String: Any]] ?? []
        return items.compactMap { item in
            guard (item["status"] as? String) != "cancelled", let cardId = item["id"] as? String else {
                return nil
            }
            let lastFour = (item["panLast4"] as? String) ?? ""
            let series = item["seriesId"] as? String
            return makeSnapshotCard(
                cardId: cardId,
                lastFour: lastFour,
                name: item["holderName"] as? String ?? "",
                identifier: series,
                providerIsBaanx: false
            )
        }
    }

    static func provision(
        cardId: String,
        certificates: [Data],
        nonce: Data,
        nonceSignature: Data,
        tokens: CardTokenSet,
        baseURL: URL,
        http: ProviderHTTP
    ) async throws -> ProvisioningPayload {
        guard certificates.count >= 2, !nonce.isEmpty, !nonceSignature.isEmpty else {
            throw ProviderClientError.invalidResponse
        }
        let body: [String: Any] = [
            "certChain": certificates.map { $0.base64EncodedString() },
            "nonce": nonce.base64EncodedString(),
            "nonceSignature": nonceSignature.base64EncodedString(),
        ]
        let url = joined(baseURL, "api/cards/\(cardId)/provision/apple-pay")
        let data = try await http.send(
            url: url,
            method: "POST",
            headers: [
                "Authorization": "Bearer \(tokens.accessToken)",
                "Content-Type": "application/json",
            ],
            body: try JSONSerialization.data(withJSONObject: body)
        )
        return try decodeProvisioning(data)
    }
}

enum FlagsClient {
    static func isEnabled(
        snapshot: ProvisioningSnapshot,
        http: ProviderHTTP = ProviderHTTP(timeout: 3)
    ) async -> Bool {
        guard let url = flagsURL(from: snapshot.flagsEndpoint.url) else {
            return snapshot.flagEnabled
        }
        do {
            let data = try await http.send(url: url, method: "GET", headers: [:])
            let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
            return ProvisioningLogic.flagEnabled(
                payload: json?[snapshot.flagsEndpoint.flagKey],
                fallback: snapshot.flagEnabled,
                appVersion: snapshot.flagsEndpoint.appVersion
            )
        } catch {
            return snapshot.flagEnabled
        }
    }

    private static func flagsURL(from snapshotURL: String) -> URL? {
        var components = URLComponents()
        components.scheme = "https"
        components.host = ProviderHosts.flagsHost
        components.path = "/v1/flags"
        components.queryItems = URLComponents(string: snapshotURL)?.queryItems
        return components.url
    }
}

func makeSnapshotCard(
    cardId: String,
    lastFour: String,
    name: String,
    identifier: String?,
    providerIsBaanx: Bool
) -> SnapshotCard {
    SnapshotCard(
        entryId: providerIsBaanx ? cardId : (identifier ?? cardId),
        cardId: cardId,
        lastFour: lastFour,
        cardholderName: name,
        primaryAccountIdentifier: providerIsBaanx ? nil : identifier,
        title: "MetaMask Card",
        localizedDescription: "MetaMask Card ending in \(lastFour)"
    )
}

func decodeProvisioning(_ data: Data) throws -> ProvisioningPayload {
    let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
    let object = (json?["data"] as? [String: Any]) ?? json
    guard
        let encrypted = object?["encryptedPassData"] as? String,
        let activation = object?["activationData"] as? String,
        let ephemeral = object?["ephemeralPublicKey"] as? String
    else {
        throw ProviderClientError.invalidResponse
    }
    return ProvisioningPayload(
        encryptedPassData: encrypted,
        activationData: activation,
        ephemeralPublicKey: ephemeral
    )
}

func jwtExpiryMilliseconds(_ jwt: String) -> Double? {
    let parts = jwt.split(separator: ".")
    guard parts.count >= 2 else { return nil }
    var payload = String(parts[1])
    payload = payload.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
    let padding = (4 - payload.count % 4) % 4
    payload += String(repeating: "=", count: padding)
    guard
        let data = Data(base64Encoded: payload),
        let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
        let exp = json["exp"] as? Double
    else {
        return nil
    }
    return exp * 1000
}
