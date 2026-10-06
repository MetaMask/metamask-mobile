@testable import WalletExtensionShared
import XCTest

final class MitigationsTests: XCTestCase {
    override func tearDown() {
        PKCERandom.bytes = { count in
            var buffer = [UInt8](repeating: 0, count: count)
            let status = SecRandomCopyBytes(kSecRandomDefault, count, &buffer)
            guard status == errSecSuccess else {
                throw ProviderClientError.invalidResponse
            }
            return buffer
        }
        super.tearDown()
    }

    func testHostAllowlistRejectsForeignHttpAndLookalikeHosts() {
        XCTAssertTrue(ProviderHosts.isAllowed(URL(string: "https://api.baanx.com")!))
        XCTAssertTrue(ProviderHosts.isAllowed(URL(string: "https://test.immersve.com/api")!))
        XCTAssertFalse(ProviderHosts.isAllowed(URL(string: "http://api.baanx.com")!))
        XCTAssertFalse(ProviderHosts.isAllowed(URL(string: "https://api.baanx.com.evil.io")!))
        XCTAssertFalse(ProviderHosts.isAllowed(URL(string: "https://evil.example")!))
    }

    func testSnapshotReadRejectsUnlistedHostAndMigratesUserDefaults() throws {
        let directory = try makeDirectory()
        var foreign = sampleSnapshot()
        foreign.apiBaseUrl = "https://evil.example"
        try SnapshotStore.write(foreign, directory: directory)
        XCTAssertNil(SnapshotStore.read(directory: directory))

        let suite = "migration-\(UUID().uuidString)"
        let defaults = UserDefaults(suiteName: suite)!
        defaults.removePersistentDomain(forName: suite)
        let legacyDirectory = try makeDirectory()
        let data = try JSONEncoder().encode(sampleSnapshot())
        defaults.set(data, forKey: ProvisioningSnapshot.storageKey)
        let migrated = SnapshotStore.read(directory: legacyDirectory, defaults: defaults)
        XCTAssertEqual(migrated?.providerUserId, "user-1")
        XCTAssertNil(defaults.data(forKey: ProvisioningSnapshot.storageKey))
        XCTAssertNotNil(SnapshotStore.read(directory: legacyDirectory))
    }

    func testFlagsRequestUsesHardCodedHost() async {
        var requested: URL?
        MockURLProtocol.handler = { request in
            requested = request.url
            return (200, Data("{}".utf8))
        }
        defer { MockURLProtocol.handler = nil }
        var snapshot = sampleSnapshot()
        snapshot.flagsEndpoint.url = "https://evil.example/v1/flags?client=mobile&environment=prod"
        _ = await FlagsClient.isEnabled(snapshot: snapshot, http: mockHTTP())
        XCTAssertEqual(requested?.host, "client-config.api.cx.metamask.io")
        XCTAssertEqual(requested?.path, "/v1/flags")
        XCTAssertTrue(requested?.query?.contains("environment=prod") == true)
    }

    func testFoxCodeRequiresContainingMetaMaskBundle() throws {
        let root = try makeDirectory()
        let app = root.appendingPathComponent("MetaMask.app")
        let appex = app.appendingPathComponent("PlugIns/Ext.appex")
        try FileManager.default.createDirectory(at: appex, withIntermediateDirectories: true)
        try writePlist(
            [
                "CFBundleIdentifier": "io.metamask.MetaMask",
                "fox_code": "from-app",
            ],
            to: app.appendingPathComponent("Info.plist")
        )
        try writePlist(
            [
                "CFBundleIdentifier": "io.metamask.MetaMask.MetaMaskWalletUIExtension",
                "fox_code": "from-extension",
            ],
            to: appex.appendingPathComponent("Info.plist")
        )
        let extensionBundle = try XCTUnwrap(Bundle(url: appex))
        XCTAssertEqual(ContainingAppFoxCode.read(bundle: extensionBundle), "from-app")

        let otherRoot = try makeDirectory()
        let otherApp = otherRoot.appendingPathComponent("MetaMask.app")
        let otherAppex = otherApp.appendingPathComponent("PlugIns/Ext.appex")
        try FileManager.default.createDirectory(at: otherAppex, withIntermediateDirectories: true)
        try writePlist(
            [
                "CFBundleIdentifier": "io.metamask.Other",
                "fox_code": "from-app",
            ],
            to: otherApp.appendingPathComponent("Info.plist")
        )
        try writePlist(
            ["CFBundleIdentifier": "io.example.ext"],
            to: otherAppex.appendingPathComponent("Info.plist")
        )
        let otherBundle = try XCTUnwrap(Bundle(url: otherAppex))
        XCTAssertNil(ContainingAppFoxCode.read(bundle: otherBundle))

        let missingKey = root.appendingPathComponent("Missing.app")
        let missingAppex = missingKey.appendingPathComponent("PlugIns/Ext.appex")
        try FileManager.default.createDirectory(at: missingAppex, withIntermediateDirectories: true)
        try writePlist(
            ["CFBundleIdentifier": "io.metamask.MetaMask"],
            to: missingKey.appendingPathComponent("Info.plist")
        )
        try writePlist(
            ["CFBundleIdentifier": "io.example.ext"],
            to: missingAppex.appendingPathComponent("Info.plist")
        )
        let missingBundle = try XCTUnwrap(Bundle(url: missingAppex))
        XCTAssertEqual(ContainingAppFoxCode.read(bundle: missingBundle), "debug")
    }

    func testExistingItemWithAnotherPasswordBlocksWrite() throws {
        let payload = try Encryptor().encrypt(
            plaintext: #"{"password":"{\"accessToken\":\"kept\",\"accessTokenExpiresAt\":1,\"location\":\"us\"}"}"#,
            password: "fixture-fox-code"
        )
        XCTAssertFalse(CardTokenKeychain.allowsWrite(existingCiphertext: payload, password: "other"))
        XCTAssertTrue(CardTokenKeychain.allowsWrite(existingCiphertext: payload, password: "fixture-fox-code"))
        XCTAssertTrue(CardTokenKeychain.allowsWrite(existingCiphertext: nil, password: "other"))
    }

    func testPKCEVerifierIsBase64URLAndRandomFailureThrows() throws {
        let verifier = try BaanxLoginClient.randomURLSafe(count: 32)
        let state = try BaanxLoginClient.randomURLSafe(count: 16)
        XCTAssertEqual(verifier.count, 43)
        XCTAssertEqual(state.count, 22)
        let alphabet = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_")
        XCTAssertNil(verifier.rangeOfCharacter(from: alphabet.inverted))
        XCTAssertNil(state.rangeOfCharacter(from: alphabet.inverted))

        PKCERandom.bytes = { _ in throw ProviderClientError.invalidResponse }
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        MockURLProtocol.handler = { _ in (500, Data()) }
        defer { MockURLProtocol.handler = nil }
        let http = ProviderHTTP(session: URLSession(configuration: configuration), timeout: 1)
        // start() throws before any request when random bytes fail
        let exp = expectation(description: "start throws")
        Task {
            do {
                _ = try await BaanxLoginClient.start(
                    baseURL: URL(string: "https://api.baanx.com")!,
                    clientKey: "key",
                    http: http
                )
                XCTFail("start returned")
            } catch {
                exp.fulfill()
            }
        }
        wait(for: [exp], timeout: 2)
    }

    func testUnknownPassIdentifierIsRejected() {
        let card = SnapshotCard(
            entryId: "card-1",
            cardId: "card-1",
            lastFour: "4242",
            cardholderName: "Ada",
            primaryAccountIdentifier: nil,
            title: "MetaMask Card",
            localizedDescription: "MetaMask Card ending in 4242"
        )
        XCTAssertNil(ProvisioningLogic.card(matching: "other", in: [card]))
        XCTAssertEqual(ProvisioningLogic.card(matching: "card-1", in: [card])?.cardId, "card-1")
    }

    func testProvisioningRejectsAShortCertificateChainAndEmptyNonce() async {
        let tokens = CardTokenSet(
            accessToken: "live",
            refreshToken: "refresh",
            accessTokenExpiresAt: Date().timeIntervalSince1970 * 1000 + 60_000,
            location: "us",
            providerUserId: "user-1"
        )
        let base = URL(string: "https://api.immersve.com")!
        let http = ProviderHTTP(timeout: 1)
        do {
            _ = try await ImmersveClient.provision(
                cardId: "card-1",
                certificates: [Data([0x01])],
                nonce: Data([0x02]),
                nonceSignature: Data([0x03]),
                tokens: tokens,
                baseURL: base,
                http: http
            )
            XCTFail("short chain was accepted")
        } catch {
            XCTAssertEqual(error as? ProviderClientError, .invalidResponse)
        }
        do {
            _ = try await BaanxClient.provision(
                certificates: [Data([0x01]), Data([0x02])],
                nonce: Data(),
                nonceSignature: Data([0x03]),
                tokens: tokens,
                baseURL: URL(string: "https://api.baanx.com")!,
                clientKey: "key",
                http: http
            )
            XCTFail("empty nonce was accepted")
        } catch {
            XCTAssertEqual(error as? ProviderClientError, .invalidResponse)
        }
    }

    func testRefreshLockBlocksAnotherProcess() throws {
        let directory = try makeDirectory()
        let bundles = Bundle.allBundles.filter { $0.bundlePath.hasSuffix(".xctest") }
        let binary = try XCTUnwrap(bundles.first).bundleURL
            .deletingLastPathComponent()
            .appendingPathComponent("lock-holder")
        let process = Process()
        process.executableURL = binary
        process.arguments = [directory.path, "3"]
        try process.run()
        Thread.sleep(forTimeInterval: 0.4)
        let lock = AppGroupRefreshLock(directory: directory)
        XCTAssertFalse(lock.acquire(timeout: 1))
        process.waitUntilExit()
        XCTAssertTrue(lock.acquire(timeout: 1))
        lock.release()
    }

    func testKeychainGroupsKeepTheCardTokensSeparate() {
        XCTAssertEqual(
            CardTokenKeychainLayout.cardAccessGroup(prefix: "TEAM."),
            "TEAM.io.metamask.MetaMask.card"
        )
        XCTAssertEqual(
            CardTokenKeychainLayout.defaultAccessGroup(
                prefix: "TEAM.",
                bundleIdentifier: "io.metamask.MetaMask"
            ),
            "TEAM.io.metamask.MetaMask"
        )
    }

    func testJavaScriptFixtureDecryptsAndDropsUnknownFields() throws {
        let fixture = try loadNamedFixture("js-item.json")
        let plain = try Encryptor().decrypt(payloadJSON: fixture.payload, password: fixture.password)
        let tokens = try XCTUnwrap(SecureItemCodec.decodeTokens(plaintext: plain))
        XCTAssertEqual(tokens.accessToken, "from-js")
        let encoded = try XCTUnwrap(SecureItemCodec.encodeTokens(tokens))
        XCTAssertFalse(encoded.contains("futureField"))
    }

    func testSwiftFixtureStillDecrypts() throws {
        let fixture = try loadNamedFixture("swift-item.json")
        let plain = try Encryptor().decrypt(payloadJSON: fixture.payload, password: fixture.password)
        XCTAssertEqual(plain, fixture.plaintext)
        XCTAssertEqual(SecureItemCodec.decodeTokens(plaintext: plain)?.accessToken, "from-swift")
    }

    func testWriteSwiftFixtureWhenRequested() throws {
        guard ProcessInfo.processInfo.environment["WRITE_SWIFT_FIXTURE"] == "1" else { return }
        let tokens = CardTokenSet(
            accessToken: "from-swift",
            refreshToken: "refresh",
            accessTokenExpiresAt: 1,
            location: "us",
            providerUserId: "user-1"
        )
        let plaintext = try XCTUnwrap(SecureItemCodec.encodeTokens(tokens))
        let payload = try Encryptor().encrypt(plaintext: plaintext, password: "fixture-fox-code")
        let object = ["password": "fixture-fox-code", "plaintext": plaintext, "payload": payload]
        let data = try JSONSerialization.data(withJSONObject: object, options: [.prettyPrinted, .sortedKeys])
        try data.write(to: fixtureURL("swift-item.json"))
    }

    private func fixtureURL(_ name: String) -> URL {
        URL(fileURLWithPath: #filePath)
            .deletingLastPathComponent()
            .appendingPathComponent("Fixtures/\(name)")
    }

    private func loadNamedFixture(_ name: String) throws -> (password: String, plaintext: String, payload: String) {
        let data = try Data(contentsOf: fixtureURL(name))
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

    private func makeDirectory() throws -> URL {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return directory
    }

    private func writePlist(_ object: [String: String], to url: URL) throws {
        let data = try PropertyListSerialization.data(fromPropertyList: object, format: .xml, options: 0)
        try data.write(to: url)
    }

    private func sampleSnapshot() -> ProvisioningSnapshot {
        ProvisioningSnapshot(
            schemaVersion: 1,
            updatedAt: 1,
            providerId: "baanx",
            providerUserId: "user-1",
            apiBaseUrl: "https://api.baanx.com",
            location: "us",
            flagEnabled: true,
            flagsEndpoint: FlagsEndpoint(
                url: "https://client-config.api.cx.metamask.io/v1/flags?client=mobile",
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
                    localizedDescription: "MetaMask Card ending in 4242"
                ),
            ]
        )
    }

    private func mockHTTP() -> ProviderHTTP {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        return ProviderHTTP(session: URLSession(configuration: configuration), timeout: 2)
    }
}
