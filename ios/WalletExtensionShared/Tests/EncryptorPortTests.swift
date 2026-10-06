@testable import WalletExtensionShared
import XCTest

final class EncryptorPortTests: XCTestCase {
    func testFixtureDecryptsWithUtf8SaltAndNotDecodedBytes() throws {
        let fixture = try loadFixture()
        let utf8 = try Encryptor(saltInterpretation: .utf8Base64String)
            .decrypt(payloadJSON: fixture.payload, password: fixture.password)
        XCTAssertEqual(utf8, fixture.plaintext)

        XCTAssertThrowsError(
            try Encryptor(saltInterpretation: .decodedBase64Bytes)
                .decrypt(payloadJSON: fixture.payload, password: fixture.password)
        )
    }

    func testSwiftEncryptRoundTripsAndMatchesNodeShape() throws {
        let plaintext = #"{"password":"{\"accessToken\":\"swift\",\"accessTokenExpiresAt\":1,\"location\":\"us\"}"}"#
        let payload = try Encryptor().encrypt(plaintext: plaintext, password: "fixture-fox-code")
        let decoded = try JSONDecoder().decode(EncryptorPayload.self, from: Data(payload.utf8))
        XCTAssertEqual(decoded.lib, "original")
        XCTAssertEqual(decoded.keyMetadata?.params.iterations, 5000)
        let plain = try Encryptor().decrypt(payloadJSON: payload, password: "fixture-fox-code")
        XCTAssertEqual(plain, plaintext)
    }

    func testSecureItemCodecRoundTrip() throws {
        let tokens = CardTokenSet(
            accessToken: "test",
            refreshToken: "refresh",
            accessTokenExpiresAt: 1,
            location: "us",
            providerUserId: "user-1"
        )
        let store = InMemoryCardTokenStore()
        try store.save(providerId: "baanx", tokens: tokens, password: "pw")
        let loaded = try store.load(providerId: "baanx", password: "pw")
        XCTAssertEqual(loaded, tokens)
    }

    func testPassFilteringPrefersIdentifierThenLastFour() {
        let cards = [
            SnapshotCard(
                entryId: "series-1",
                cardId: "card-1",
                lastFour: "1234",
                cardholderName: "Ada",
                primaryAccountIdentifier: "series-1",
                title: "MetaMask Card",
                localizedDescription: "MetaMask Card ending in 1234",
            ),
            SnapshotCard(
                entryId: "card-2",
                cardId: "card-2",
                lastFour: "9999",
                cardholderName: "Ada",
                primaryAccountIdentifier: nil,
                title: "MetaMask Card",
                localizedDescription: "MetaMask Card ending in 9999",
            ),
        ]
        let installed = [InstalledPass(primaryAccountIdentifier: "series-1", primaryAccountNumberSuffix: "0000")]
        let available = ProvisioningLogic.cardsAvailable(cards: cards, installed: installed)
        XCTAssertEqual(available.map(\.cardId), ["card-2"])

        let bySuffix = ProvisioningLogic.cardsAvailable(
            cards: cards,
            installed: [InstalledPass(primaryAccountIdentifier: nil, primaryAccountNumberSuffix: "9999")]
        )
        XCTAssertEqual(bySuffix.map(\.cardId), ["series-1" == cards[0].entryId ? "card-1" : "card-1"])
    }

    func testExpiredAccessTokenNeedsRefreshAndSessionGuard() {
        let stale = CardTokenSet(
            accessToken: "old",
            refreshToken: "r",
            accessTokenExpiresAt: 0,
            location: "us",
            providerUserId: "user-1"
        )
        XCTAssertTrue(ProvisioningLogic.shouldRefreshAccessToken(stale, now: Date(timeIntervalSince1970: 10_000)))
        let snapshot = sampleSnapshot(providerUserId: "user-1")
        XCTAssertTrue(ProvisioningLogic.sessionMatches(snapshot: snapshot, tokens: stale))
        var other = stale
        other.providerUserId = "other"
        XCTAssertFalse(ProvisioningLogic.sessionMatches(snapshot: snapshot, tokens: other))
        var missing = snapshot
        missing.providerUserId = nil
        XCTAssertTrue(ProvisioningLogic.sessionMatches(snapshot: missing, tokens: stale))
        missing.providerUserId = ""
        XCTAssertTrue(ProvisioningLogic.sessionMatches(snapshot: missing, tokens: stale))
    }

    func testFlagFallbackWhenRemoteMissingAndVersionGate() {
        XCTAssertEqual(
            ProvisioningLogic.flagEnabled(payload: nil, fallback: true, appVersion: "8.15.0"),
            true
        )
        XCTAssertFalse(
            ProvisioningLogic.flagEnabled(
                payload: ["enabled": true, "minimumVersion": "9.0.0"],
                fallback: true,
                appVersion: "8.15.0"
            )
        )
        XCTAssertTrue(
            ProvisioningLogic.flagEnabled(
                payload: ["enabled": true, "minimumVersion": "8.0.0"],
                fallback: false,
                appVersion: "8.15.0"
            )
        )
    }

    func testRefreshLockAcquireAndRelease() throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let lock = AppGroupRefreshLock(directory: directory)
        XCTAssertTrue(lock.acquire(timeout: 1))
        lock.release()
        XCTAssertTrue(lock.acquire(timeout: 1))
        lock.release()
    }

    func testFoxCodeMissingKeyFallsBackAndEmptyStringDoesNot() {
        XCTAssertEqual(FoxCodeReader.value(in: nil), "debug")
        XCTAssertEqual(FoxCodeReader.value(in: ["fox_code": ""]), "")
        XCTAssertEqual(FoxCodeReader.value(in: ["fox_code": "abc"]), "abc")
    }

    func testKilledAppWithExpiredAccessTokenStillHasSnapshotCards() throws {
        let snapshot = sampleSnapshot(providerUserId: "user-1")
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try SnapshotStore.write(snapshot, directory: directory)
        let stored = SnapshotStore.read(directory: directory)
        XCTAssertEqual(stored?.cards.count, 1)
        let tokens = CardTokenSet(
            accessToken: "expired",
            refreshToken: "still-good",
            accessTokenExpiresAt: 0,
            location: "us",
            providerUserId: "user-1"
        )
        XCTAssertTrue(ProvisioningLogic.shouldRefreshAccessToken(tokens))
        XCTAssertTrue(ProvisioningLogic.sessionMatches(snapshot: snapshot, tokens: tokens))
    }

    private func sampleSnapshot(providerUserId: String) -> ProvisioningSnapshot {
        ProvisioningSnapshot(
            schemaVersion: 1,
            updatedAt: 1,
            providerId: "baanx",
            providerUserId: providerUserId,
            apiBaseUrl: "https://api.baanx.com",
            location: "us",
            flagEnabled: true,
            flagsEndpoint: FlagsEndpoint(
                url: "https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=prod",
                flagKey: "galileoAppleWalletInAppProvisioningEnabled",
                appVersion: "8.15.0"
            ),
            baanxClientKey: "key",
            immersveClientApplicationId: nil,
            immersveAppUrl: nil,
            cards: [
                SnapshotCard(
                    entryId: "card-1",
                    cardId: "card-1",
                    lastFour: "4242",
                    cardholderName: "Ada",
                    primaryAccountIdentifier: nil,
                    title: "MetaMask Card",
                    localizedDescription: "MetaMask Card ending in 4242",
                ),
            ]
        )
    }

    private func loadFixture() throws -> (password: String, plaintext: String, payload: String) {
        let url = URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("Fixtures/secure-item.json")
        let data = try Data(contentsOf: url)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: String]
        guard
            let password = json?["password"],
            let plaintext = json?["plaintext"],
            let payload = json?["payload"]
        else {
            throw EncryptorError.invalidPayload
        }
        return (password, plaintext, payload)
    }
}
