import Foundation

struct CardTokenSet: Codable, Equatable {
    var accessToken: String
    var refreshToken: String?
    var accessTokenExpiresAt: Double
    var refreshTokenExpiresAt: Double?
    var location: String
    var providerUserId: String?
    var cardholderAccountId: String?
    var accountAddress: String?
    var keyringId: String?

    var sessionIdentity: String? {
        providerUserId ?? cardholderAccountId
    }

    func accessTokenIsStale(now: Date = Date(), buffer: TimeInterval = 5 * 60) -> Bool {
        accessTokenExpiresAt <= now.timeIntervalSince1970 * 1000 + buffer * 1000
    }
}

struct SnapshotCard: Codable, Equatable {
    var entryId: String
    var cardId: String
    var lastFour: String
    var cardholderName: String
    var network: String
    var primaryAccountIdentifier: String?
    var title: String
    var localizedDescription: String
    var artKey: String
}

struct FlagsEndpoint: Codable, Equatable {
    var url: String
    var flagKey: String
    var appVersion: String
}

struct ProvisioningSnapshot: Codable, Equatable {
    var schemaVersion: Int
    var updatedAt: Double
    var providerId: String
    var providerUserId: String?
    var apiBaseUrl: String
    var location: String
    var flagEnabled: Bool
    var flagsEndpoint: FlagsEndpoint
    var baanxClientKey: String?
    var immersveClientApplicationId: String?
    var immersveAppUrl: String?
    var cards: [SnapshotCard]

    static let storageKey = "CardWalletProvisioning.v1"
    static let currentSchemaVersion = 1
}

struct InstalledPass: Equatable {
    var primaryAccountIdentifier: String?
    var primaryAccountNumberSuffix: String
}

enum SecureItemCodec {
    static func wrap(tokenJSON: String) -> String {
        let body = ["password": tokenJSON]
        let data = try? JSONSerialization.data(withJSONObject: body, options: [.sortedKeys])
        return String(data: data ?? Data(), encoding: .utf8) ?? "{}"
    }

    static func unwrap(plaintext: String) -> String? {
        guard
            let data = plaintext.data(using: .utf8),
            let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let password = object["password"] as? String
        else {
            return nil
        }
        return password
    }

    static func decodeTokens(plaintext: String) -> CardTokenSet? {
        guard let tokenJSON = unwrap(plaintext: plaintext), let data = tokenJSON.data(using: .utf8) else {
            return nil
        }
        return try? JSONDecoder().decode(CardTokenSet.self, from: data)
    }

    static func encodeTokens(_ tokens: CardTokenSet) -> String? {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.sortedKeys]
        guard let data = try? encoder.encode(tokens), let json = String(data: data, encoding: .utf8) else {
            return nil
        }
        return wrap(tokenJSON: json)
    }
}

enum CardTokenKeychainLayout {
    static let appGroupSuffix = "io.metamask.MetaMask"
    static let teamPrefix = "48XVW22RCG"

    static func accessGroup(teamPrefix: String = CardTokenKeychainLayout.teamPrefix) -> String {
        "\(teamPrefix).\(appGroupSuffix)"
    }

    static func service(providerId: String) -> String {
        providerId == "baanx"
            ? "com.metamask.CARD_BAANX_TOKENS"
            : "com.metamask.CARD_TOKENS_\(providerId)"
    }

    static func account(providerId: String) -> String {
        providerId == "baanx" ? "CARD_BAANX_TOKENS" : "CARD_TOKENS_\(providerId)"
    }
}
