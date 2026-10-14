import Foundation

struct EncryptionKeyMetadata: Codable, Equatable {
    var algorithm: String
    var params: Params

    struct Params: Codable, Equatable {
        var iterations: Int
    }
}

struct EncryptorPayload: Codable, Equatable {
    var cipher: String
    var iv: String
    var salt: String?
    var keyMetadata: EncryptionKeyMetadata?
    var lib: String?
}

public enum SaltInterpretation: String {
    /// UTF-8 bytes of the base64 salt string. This is what
    /// react-native-quick-crypto does with a string salt.
    case utf8Base64String
    /// Raw bytes decoded from the base64 salt. Kept so fixtures can reject it.
    case decodedBase64Bytes
}

extension SaltInterpretation: Sendable {}
