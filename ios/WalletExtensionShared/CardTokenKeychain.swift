import Foundation
import Security

enum CardTokenStoreError: Error {
    case encodingFailed
    case writeRejected
    case verifyFailed
}

protocol CardTokenStoring {
    func load(providerId: String, password: String) throws -> CardTokenSet?
    func save(providerId: String, tokens: CardTokenSet, password: String) throws
}

struct KeychainCardTokenStore: CardTokenStoring {
    func load(providerId: String, password: String) throws -> CardTokenSet? {
        try CardTokenKeychain.load(providerId: providerId, password: password)
    }

    func save(providerId: String, tokens: CardTokenSet, password: String) throws {
        try CardTokenKeychain.save(providerId: providerId, tokens: tokens, password: password)
    }
}

final class InMemoryCardTokenStore: CardTokenStoring {
    private var items: [String: String] = [:]
    private let encryptor = Encryptor()

    func load(providerId: String, password: String) throws -> CardTokenSet? {
        guard let payload = items[providerId] else { return nil }
        let plain = try encryptor.decrypt(payloadJSON: payload, password: password)
        return SecureItemCodec.decodeTokens(plaintext: plain)
    }

    func save(providerId: String, tokens: CardTokenSet, password: String) throws {
        guard let wrapped = SecureItemCodec.encodeTokens(tokens) else {
            throw CardTokenStoreError.encodingFailed
        }
        let payload = try encryptor.encrypt(plaintext: wrapped, password: password)
        let check = try encryptor.decrypt(payloadJSON: payload, password: password)
        guard SecureItemCodec.decodeTokens(plaintext: check)?.accessToken == tokens.accessToken else {
            throw CardTokenStoreError.verifyFailed
        }
        items[providerId] = payload
    }
}

enum CardTokenKeychain {
    static func load(
        providerId: String,
        password: String,
        accessGroup: String = CardTokenKeychainLayout.accessGroup()
    ) throws -> CardTokenSet? {
        guard let payload = try readPayload(providerId: providerId, accessGroup: accessGroup) else {
            return nil
        }
        let plain = try Encryptor().decrypt(payloadJSON: payload, password: password)
        return SecureItemCodec.decodeTokens(plaintext: plain)
    }

    static func save(
        providerId: String,
        tokens: CardTokenSet,
        password: String,
        accessGroup: String = CardTokenKeychainLayout.accessGroup()
    ) throws {
        guard let wrapped = SecureItemCodec.encodeTokens(tokens) else {
            throw CardTokenStoreError.encodingFailed
        }
        let previous = try readPayload(providerId: providerId, accessGroup: accessGroup)
        guard allowsWrite(existingCiphertext: previous, password: password) else {
            throw CardTokenStoreError.verifyFailed
        }
        let payload = try Encryptor().encrypt(plaintext: wrapped, password: password)
        let verified = try Encryptor().decrypt(payloadJSON: payload, password: password)
        guard SecureItemCodec.decodeTokens(plaintext: verified)?.accessToken == tokens.accessToken else {
            throw CardTokenStoreError.verifyFailed
        }
        do {
            try writePayload(payload, providerId: providerId, accessGroup: accessGroup)
            let roundTrip = try load(providerId: providerId, password: password, accessGroup: accessGroup)
            guard roundTrip?.accessToken == tokens.accessToken else {
                throw CardTokenStoreError.verifyFailed
            }
        } catch {
            if let previous {
                try? writePayload(previous, providerId: providerId, accessGroup: accessGroup)
            }
            throw error
        }
    }

    static func allowsWrite(existingCiphertext: String?, password: String) -> Bool {
        guard let existingCiphertext else { return true }
        guard
            let plain = try? Encryptor().decrypt(payloadJSON: existingCiphertext, password: password),
            SecureItemCodec.decodeTokens(plaintext: plain) != nil
        else {
            return false
        }
        return true
    }

    private static func query(providerId: String, accessGroup: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: CardTokenKeychainLayout.service(providerId: providerId),
            kSecAttrAccount as String: CardTokenKeychainLayout.account(providerId: providerId),
            kSecAttrAccessGroup as String: accessGroup,
        ]
    }

    private static func readPayload(providerId: String, accessGroup: String) throws -> String? {
        var query = query(providerId: providerId, accessGroup: accessGroup)
        query[kSecReturnData as String] = true
        query[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = item as? Data, let text = String(data: data, encoding: .utf8) else {
            throw CardTokenStoreError.writeRejected
        }
        return text
    }

    private static func writePayload(_ payload: String, providerId: String, accessGroup: String) throws {
        let data = Data(payload.utf8)
        let base = query(providerId: providerId, accessGroup: accessGroup)
        let updateStatus = SecItemUpdate(base as CFDictionary, [kSecValueData as String: data] as CFDictionary)
        if updateStatus == errSecSuccess { return }
        if updateStatus != errSecItemNotFound {
            throw CardTokenStoreError.writeRejected
        }
        var add = base
        add[kSecValueData as String] = data
        add[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        let addStatus = SecItemAdd(add as CFDictionary, nil)
        guard addStatus == errSecSuccess else {
            throw CardTokenStoreError.writeRejected
        }
    }
}
