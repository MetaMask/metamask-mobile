@testable import WalletExtensionShared
import XCTest

final class MockURLProtocol: URLProtocol {
    nonisolated(unsafe) static var handler: ((URLRequest) throws -> (Int, Data))?

    override class func canInit(with request: URLRequest) -> Bool { true }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = Self.handler else {
            client?.urlProtocol(self, didFailWithError: URLError(.badServerResponse))
            return
        }
        do {
            let (status, data) = try handler(request)
            let response = HTTPURLResponse(
                url: request.url ?? URL(string: "https://card.example")!,
                statusCode: status,
                httpVersion: nil,
                headerFields: nil
            )!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}

final class SequencedTokenStore: CardTokenStoring {
    var sequence: [CardTokenSet]
    var saved: [CardTokenSet] = []
    private var index = 0

    init(_ sequence: [CardTokenSet]) {
        self.sequence = sequence
    }

    func load(providerId: String, password: String) throws -> CardTokenSet? {
        let item = sequence[min(index, sequence.count - 1)]
        index += 1
        return item
    }

    func save(providerId: String, tokens: CardTokenSet, password: String) throws {
        saved.append(tokens)
    }
}

/// Returns the item a fixed number of times, then nothing. `save` does not recreate it.
final class VanishingTokenStore: CardTokenStoring {
    private let tokens: CardTokenSet
    private var loadsRemaining: Int

    init(tokens: CardTokenSet, loadsBeforeVanishing: Int) {
        self.tokens = tokens
        self.loadsRemaining = loadsBeforeVanishing
    }

    func load(providerId: String, password: String) throws -> CardTokenSet? {
        guard loadsRemaining > 0 else { return nil }
        loadsRemaining -= 1
        return tokens
    }

    func save(providerId: String, tokens: CardTokenSet, password: String) throws {
        throw CardTokenStoreError.itemMissing
    }
}

final class SessionRefreshTests: XCTestCase {
    private let password = "fixture-fox-code"

    override func tearDown() {
        MockURLProtocol.handler = nil
        super.tearDown()
    }

    func testKilledAppRefreshesExpiredAccessTokenAndKeepsSnapshot() async throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let snapshot = sampleSnapshot()
        try SnapshotStore.write(snapshot, directory: directory)
        let store = InMemoryCardTokenStore()
        try store.seed(providerId: "baanx", tokens: staleTokens(), password: password)
        MockURLProtocol.handler = { request in
            XCTAssertEqual(request.url?.path, "/v1/auth/oauth/token")
            let body = [
                "access_token": "renewed",
                "refresh_token": "rotated",
                "expires_in": 3600,
                "refresh_token_expires_in": 86_400,
            ] as [String: Any]
            return (200, try JSONSerialization.data(withJSONObject: body))
        }

        let outcome = await SessionRefresh.usableTokens(
            snapshot: snapshot,
            store: store,
            http: mockHTTP(),
            password: password,
            lockDirectory: FileManager.default.temporaryDirectory
        )

        guard case let .ready(tokens) = outcome else {
            XCTFail("expected a refreshed session")
            return
        }
        XCTAssertEqual(tokens.accessToken, "renewed")
        XCTAssertEqual(tokens.refreshToken, "rotated")
        let stored = try store.load(providerId: "baanx", password: password)
        XCTAssertEqual(stored?.accessToken, "renewed")
        XCTAssertEqual(SnapshotStore.read(directory: directory)?.cards.first?.lastFour, "4242")
    }

    func testRejectedRefreshUsesTokensAnotherProcessWrote() async throws {
        let fresh = freshTokens(accessToken: "from-app")
        let store = SequencedTokenStore([staleTokens(), fresh])
        var requested = false
        MockURLProtocol.handler = { _ in
            requested = true
            return (401, Data("no".utf8))
        }

        let outcome = await SessionRefresh.usableTokens(
            snapshot: sampleSnapshot(),
            store: store,
            http: mockHTTP(),
            password: password,
            lockDirectory: FileManager.default.temporaryDirectory
        )

        guard case let .ready(tokens) = outcome else {
            XCTFail("expected the tokens written by the other process")
            return
        }
        XCTAssertEqual(tokens.accessToken, "from-app")
        XCTAssertFalse(requested)
        XCTAssertTrue(store.saved.isEmpty)
    }

    func testDeadRefreshLeavesSnapshotInPlace() async throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let snapshot = sampleSnapshot()
        try SnapshotStore.write(snapshot, directory: directory)
        let store = SequencedTokenStore([staleTokens()])
        MockURLProtocol.handler = { _ in (401, Data()) }

        let outcome = await SessionRefresh.usableTokens(
            snapshot: snapshot,
            store: store,
            http: mockHTTP(),
            password: password,
            lockDirectory: FileManager.default.temporaryDirectory
        )

        guard case .expired = outcome else {
            XCTFail("expected a rejected refresh to expire the session")
            return
        }
        XCTAssertNotNil(SnapshotStore.read(directory: directory))
    }

    func testNetworkFailureKeepsTheSessionUnavailable() async throws {
        let store = SequencedTokenStore([staleTokens()])
        MockURLProtocol.handler = { _ in throw URLError(.notConnectedToInternet) }

        let outcome = await SessionRefresh.usableTokens(
            snapshot: sampleSnapshot(),
            store: store,
            http: mockHTTP(),
            password: password,
            lockDirectory: FileManager.default.temporaryDirectory
        )

        guard case .unavailable = outcome else {
            XCTFail("expected a network failure to stay unavailable")
            return
        }
    }

    func testExpiredRefreshTokenSkipsTheNetwork() async throws {
        var requested = false
        MockURLProtocol.handler = { _ in
            requested = true
            return (200, Data())
        }
        let store = SequencedTokenStore([staleTokens(refreshTokenExpiresAt: 1)])

        let outcome = await SessionRefresh.usableTokens(
            snapshot: sampleSnapshot(),
            store: store,
            http: mockHTTP(),
            password: password,
            lockDirectory: FileManager.default.temporaryDirectory
        )

        guard case .expired = outcome else {
            XCTFail("expected an expired refresh token")
            return
        }
        XCTAssertFalse(requested)
    }

    func testImmersveCardsDropBlockedAndCancelled() async throws {
        MockURLProtocol.handler = { _ in
            let body: [String: Any] = [
                "items": [
                    ["id": "active", "status": "active", "panLast4": "1111", "isBlocked": false],
                    ["id": "frozen", "status": "active", "panLast4": "2222", "isBlocked": true],
                    ["id": "cancelled", "status": "cancelled", "panLast4": "3333", "isBlocked": false],
                ],
            ]
            return (200, try JSONSerialization.data(withJSONObject: body))
        }
        let cards = try await ImmersveClient.cards(
            tokens: freshTokens(accessToken: "live", cardholderAccountId: "acct-1"),
            baseURL: URL(string: "https://api.immersve.com")!,
            http: mockHTTP()
        )
        XCTAssertEqual(cards.map(\.cardId), ["active"])
    }

    func testSessionLooksUsableRejectsAMissingExpiredOrMismatchedSession() {
        let snapshot = sampleSnapshot()
        XCTAssertFalse(ProvisioningLogic.sessionLooksUsable(snapshot: snapshot, tokens: nil))
        XCTAssertFalse(
            ProvisioningLogic.sessionLooksUsable(
                snapshot: snapshot,
                tokens: freshTokens(accessToken: "live", providerUserId: "other")
            )
        )
        XCTAssertFalse(
            ProvisioningLogic.sessionLooksUsable(
                snapshot: snapshot,
                tokens: staleTokens(refreshTokenExpiresAt: 1)
            )
        )
        XCTAssertTrue(
            ProvisioningLogic.sessionLooksUsable(
                snapshot: snapshot,
                tokens: freshTokens(accessToken: "live")
            )
        )
    }

    func testExcludingRemotePassesKeepsLocalPassesOnly() {
        let local = ProvisioningLogic.excludingRemotePasses(["phone", "watch", "phone-2"]) { $0 == "watch" }
        XCTAssertEqual(local, ["phone", "phone-2"])
    }

    func testSeriesIdMatchHidesTheCardWhenTheLastFourDiffer() {
        let card = card(entryId: "series-1", cardId: "card-1", lastFour: "9999", identifier: "series-1")
        let installed = [
            InstalledPass(primaryAccountIdentifier: "series-1", primaryAccountNumberSuffix: "0000"),
        ]
        XCTAssertTrue(ProvisioningLogic.cardsAvailable(cards: [card], installed: installed).isEmpty)
    }

    func testFlagTurnedOffSinceLastAppRun() async throws {
        MockURLProtocol.handler = { _ in
            let body = [
                "galileoAppleWalletInAppProvisioningEnabled": [
                    "enabled": false,
                    "minimumVersion": "1.0.0",
                ],
            ] as [String: Any]
            return (200, try JSONSerialization.data(withJSONObject: body))
        }
        let enabled = await FlagsClient.isEnabled(snapshot: sampleSnapshot(flagEnabled: true), http: mockHTTP())
        XCTAssertFalse(enabled)
    }

    func testFlagFetchFailureFallsBackToSnapshot() async throws {
        MockURLProtocol.handler = { _ in throw URLError(.notConnectedToInternet) }
        let enabled = await FlagsClient.isEnabled(snapshot: sampleSnapshot(flagEnabled: true), http: mockHTTP())
        XCTAssertTrue(enabled)
    }

    func testReissuedCardStaysHiddenWhenSeriesMatchesAndNewSeriesAppears() {
        let installed = [InstalledPass(primaryAccountIdentifier: "series-old", primaryAccountNumberSuffix: "1111")]
        let reissued = card(entryId: "series-old", cardId: "card-new", lastFour: "2222", identifier: "series-old")
        let added = card(entryId: "series-new", cardId: "card-added", lastFour: "3333", identifier: "series-new")
        let available = ProvisioningLogic.cardsAvailable(cards: [reissued, added], installed: installed)
        XCTAssertEqual(available.map(\.cardId), ["card-added"])
    }

    func testBaanxProvisionBodyIsHexOfCertificateBytes() async throws {
        var captured: Data?
        MockURLProtocol.handler = { request in
            captured = Self.requestBody(request)
            let body = [
                "encryptedPassData": "YQ==",
                "activationData": "Yg==",
                "ephemeralPublicKey": "Yw==",
            ]
            return (200, try JSONSerialization.data(withJSONObject: body))
        }
        let payload = try await BaanxClient.provision(
            certificates: [Data([0xAB, 0xCD]), Data([0x01])],
            nonce: Data([0x10]),
            nonceSignature: Data([0x20]),
            tokens: freshTokens(accessToken: "live"),
            baseURL: URL(string: "https://card.example")!,
            clientKey: "client-key",
            http: mockHTTP()
        )
        let json = try JSONSerialization.jsonObject(with: captured ?? Data()) as? [String: String]
        XCTAssertEqual(json?["leafCertificate"], "abcd")
        XCTAssertEqual(json?["intermediateCertificate"], "01")
        XCTAssertEqual(json?["nonce"], "10")
        XCTAssertEqual(json?["nonceSignature"], "20")
        XCTAssertEqual(payload.encryptedPassData, "YQ==")
    }

    func testWriteBackReplacesCiphertextAndStillDecrypts() throws {
        let store = InMemoryCardTokenStore()
        try store.seed(providerId: "baanx", tokens: staleTokens(), password: password)
        try store.save(providerId: "baanx", tokens: freshTokens(accessToken: "after-refresh"), password: password)
        let loaded = try store.load(providerId: "baanx", password: password)
        XCTAssertEqual(loaded?.accessToken, "after-refresh")
        XCTAssertEqual(loaded?.refreshToken, "refresh")
        XCTAssertThrowsError(
            try InMemoryCardTokenStore().save(
                providerId: "baanx",
                tokens: freshTokens(accessToken: "new"),
                password: password
            )
        ) { error in
            guard case CardTokenStoreError.itemMissing = error else {
                XCTFail("expected a missing item")
                return
            }
        }
    }

    func testRefreshWhoseItemDisappearsDoesNotRecreateIt() async throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let store = VanishingTokenStore(tokens: staleTokens(), loadsBeforeVanishing: 3)
        MockURLProtocol.handler = { _ in
            let body = [
                "access_token": "renewed",
                "refresh_token": "rotated",
                "expires_in": 3600,
            ] as [String: Any]
            return (200, try JSONSerialization.data(withJSONObject: body))
        }

        let outcome = await SessionRefresh.usableTokens(
            snapshot: sampleSnapshot(),
            store: store,
            http: mockHTTP(),
            password: password,
            lockDirectory: directory
        )

        guard case .unavailable = outcome else {
            XCTFail("expected a missing item to stay unavailable")
            return
        }
        let stored = try store.load(providerId: "baanx", password: password)
        XCTAssertNil(stored)
    }

    func testChangedUserUnderTheLockDoesNotRefresh() async throws {
        var requested = false
        MockURLProtocol.handler = { _ in
            requested = true
            return (500, Data())
        }
        let store = SequencedTokenStore([
            staleTokens(),
            staleTokens(providerUserId: "other"),
        ])

        let outcome = await SessionRefresh.usableTokens(
            snapshot: sampleSnapshot(),
            store: store,
            http: mockHTTP(),
            password: password,
            lockDirectory: FileManager.default.temporaryDirectory
        )

        guard case .unavailable = outcome else {
            XCTFail("expected a changed user to stay unavailable")
            return
        }
        XCTAssertFalse(requested)
        XCTAssertTrue(store.saved.isEmpty)
    }

    func testReplaceCardsSkipsAClearedOrReplacedSnapshot() throws {
        let directory = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString, isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        let snapshot = sampleSnapshot()
        let live = [card(entryId: "card-2", cardId: "card-2", lastFour: "9999", identifier: nil)]
        try SnapshotStore.write(snapshot, directory: directory)
        SnapshotStore.clear(directory: directory)
        SnapshotStore.replaceCards(live, ifStillMatching: snapshot, directory: directory)
        XCTAssertNil(SnapshotStore.read(directory: directory))

        var replaced = snapshot
        replaced.providerUserId = "other"
        try SnapshotStore.write(replaced, directory: directory)
        SnapshotStore.replaceCards(live, ifStillMatching: snapshot, directory: directory)
        XCTAssertEqual(SnapshotStore.read(directory: directory)?.providerUserId, "other")
        XCTAssertEqual(SnapshotStore.read(directory: directory)?.cards.first?.cardId, "card-1")

        try SnapshotStore.write(snapshot, directory: directory)
        SnapshotStore.replaceCards(live, ifStillMatching: snapshot, directory: directory)
        XCTAssertEqual(SnapshotStore.read(directory: directory)?.cards.first?.cardId, "card-2")
    }

    private static func requestBody(_ request: URLRequest) -> Data? {
        if let body = request.httpBody, !body.isEmpty { return body }
        guard let stream = request.httpBodyStream else { return request.httpBody }
        stream.open()
        defer { stream.close() }
        var data = Data()
        let buffer = UnsafeMutablePointer<UInt8>.allocate(capacity: 1024)
        defer { buffer.deallocate() }
        while stream.hasBytesAvailable {
            let count = stream.read(buffer, maxLength: 1024)
            if count <= 0 { break }
            data.append(buffer, count: count)
        }
        return data
    }

    private func mockHTTP() -> ProviderHTTP {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [MockURLProtocol.self]
        return ProviderHTTP(session: URLSession(configuration: configuration), timeout: 2)
    }

    private func staleTokens(
        refreshTokenExpiresAt: Double? = nil,
        providerUserId: String = "user-1"
    ) -> CardTokenSet {
        CardTokenSet(
            accessToken: "old",
            refreshToken: "refresh",
            accessTokenExpiresAt: 1,
            refreshTokenExpiresAt: refreshTokenExpiresAt,
            location: "us",
            providerUserId: providerUserId
        )
    }

    private func freshTokens(
        accessToken: String,
        providerUserId: String = "user-1",
        cardholderAccountId: String? = nil
    ) -> CardTokenSet {
        CardTokenSet(
            accessToken: accessToken,
            refreshToken: "refresh",
            accessTokenExpiresAt: Date().timeIntervalSince1970 * 1000 + 60 * 60 * 1000,
            location: "us",
            providerUserId: providerUserId,
            cardholderAccountId: cardholderAccountId
        )
    }

    private func sampleSnapshot(flagEnabled: Bool = true) -> ProvisioningSnapshot {
        ProvisioningSnapshot(
            schemaVersion: 1,
            updatedAt: 1,
            providerId: "baanx",
            providerUserId: "user-1",
            apiBaseUrl: "https://api.baanx.com",
            location: "us",
            flagEnabled: flagEnabled,
            flagsEndpoint: FlagsEndpoint(
                url: "https://client-config.api.cx.metamask.io/v1/flags?client=mobile",
                flagKey: "galileoAppleWalletInAppProvisioningEnabled",
                appVersion: "8.15.0"
            ),
            baanxClientKey: "client-key",
            immersveClientApplicationId: nil,
            immersveAppUrl: nil,
            cards: [card(entryId: "card-1", cardId: "card-1", lastFour: "4242", identifier: nil)]
        )
    }

    private func card(entryId: String, cardId: String, lastFour: String, identifier: String?) -> SnapshotCard {
        SnapshotCard(
            entryId: entryId,
            cardId: cardId,
            lastFour: lastFour,
            cardholderName: "Ada",
            primaryAccountIdentifier: identifier,
            title: "MetaMask Card",
            localizedDescription: "MetaMask Card ending in \(lastFour)",
        )
    }
}
