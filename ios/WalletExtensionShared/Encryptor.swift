import CommonCrypto
import Foundation
import Security

public enum EncryptorError: Error, Equatable {
    case invalidPayload
    case invalidEncoding
    case keyDerivationFailed
    case cipherFailed
}

public struct Encryptor {
    static let defaultIterations = 5000
    static let libraryTag = "original"
    var saltInterpretation: SaltInterpretation

    public init(saltInterpretation: SaltInterpretation = .utf8Base64String) {
        self.saltInterpretation = saltInterpretation
    }

    public func decrypt(payloadJSON: String, password: String) throws -> String {
        guard let data = payloadJSON.data(using: .utf8) else {
            throw EncryptorError.invalidPayload
        }
        let payload = try JSONDecoder().decode(EncryptorPayload.self, from: data)
        guard
            let salt = payload.salt,
            let cipher = Data(base64Encoded: payload.cipher),
            let iv = Data(hexEncoded: payload.iv),
            iv.count == 16
        else {
            throw EncryptorError.invalidPayload
        }
        let iterations = payload.keyMetadata?.params.iterations ?? Self.defaultIterations
        let key = try deriveKey(password: password, salt: salt, iterations: iterations)
        let plain = try crypt(operation: CCOperation(kCCDecrypt), data: cipher, key: key, iv: iv)
        guard let text = String(data: plain, encoding: .utf8) else {
            throw EncryptorError.invalidEncoding
        }
        return text
    }

    public func encrypt(plaintext: String, password: String) throws -> String {
        let saltBytes = try randomBytes(count: 16)
        let salt = saltBytes.base64EncodedString()
        let iv = try randomBytes(count: 16)
        let key = try deriveKey(password: password, salt: salt, iterations: Self.defaultIterations)
        guard let plainData = plaintext.data(using: .utf8) else {
            throw EncryptorError.invalidEncoding
        }
        let cipher = try crypt(operation: CCOperation(kCCEncrypt), data: plainData, key: key, iv: iv)
        let payload = EncryptorPayload(
            cipher: cipher.base64EncodedString(),
            iv: iv.hexEncodedString(),
            salt: salt,
            keyMetadata: EncryptionKeyMetadata(
                algorithm: "PBKDF2",
                params: .init(iterations: Self.defaultIterations)
            ),
            lib: Self.libraryTag
        )
        let encoded = try JSONEncoder().encode(payload)
        guard let json = String(data: encoded, encoding: .utf8) else {
            throw EncryptorError.invalidEncoding
        }
        return json
    }

    private func deriveKey(password: String, salt: String, iterations: Int) throws -> Data {
        let saltBytes = saltMaterial(salt)
        let passwordBytes = Array(password.utf8)
        var derived = [UInt8](repeating: 0, count: kCCKeySizeAES256)
        let status = CCKeyDerivationPBKDF(
            CCPBKDFAlgorithm(kCCPBKDF2),
            passwordBytes,
            passwordBytes.count,
            saltBytes,
            saltBytes.count,
            CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA512),
            UInt32(iterations),
            &derived,
            derived.count
        )
        guard status == kCCSuccess else {
            throw EncryptorError.keyDerivationFailed
        }
        return Data(derived)
    }

    private func saltMaterial(_ salt: String) -> [UInt8] {
        switch saltInterpretation {
        case .utf8Base64String:
            return Array(salt.utf8)
        case .decodedBase64Bytes:
            return Array(Data(base64Encoded: salt) ?? Data())
        }
    }

    private func crypt(operation: CCOperation, data: Data, key: Data, iv: Data) throws -> Data {
        let outLength = data.count + kCCBlockSizeAES128
        var out = [UInt8](repeating: 0, count: outLength)
        var moved = 0
        let status = data.withUnsafeBytes { dataBytes in
            key.withUnsafeBytes { keyBytes in
                iv.withUnsafeBytes { ivBytes in
                    CCCrypt(
                        operation,
                        CCAlgorithm(kCCAlgorithmAES),
                        CCOptions(kCCOptionPKCS7Padding),
                        keyBytes.baseAddress,
                        kCCKeySizeAES256,
                        ivBytes.baseAddress,
                        dataBytes.baseAddress,
                        data.count,
                        &out,
                        outLength,
                        &moved
                    )
                }
            }
        }
        guard status == kCCSuccess else {
            throw EncryptorError.cipherFailed
        }
        return Data(out.prefix(moved))
    }

    private func randomBytes(count: Int) throws -> Data {
        var bytes = [UInt8](repeating: 0, count: count)
        let status = SecRandomCopyBytes(kSecRandomDefault, count, &bytes)
        guard status == errSecSuccess else {
            throw EncryptorError.cipherFailed
        }
        return Data(bytes)
    }
}

extension Data {
    init?(hexEncoded: String) {
        let hex = hexEncoded.hasPrefix("0x") ? String(hexEncoded.dropFirst(2)) : hexEncoded
        guard hex.count % 2 == 0 else { return nil }
        var data = Data(capacity: hex.count / 2)
        var index = hex.startIndex
        while index < hex.endIndex {
            let next = hex.index(index, offsetBy: 2)
            guard let byte = UInt8(hex[index..<next], radix: 16) else { return nil }
            data.append(byte)
            index = next
        }
        self = data
    }

    func hexEncodedString() -> String {
        map { String(format: "%02x", $0) }.joined()
    }
}
