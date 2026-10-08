import Foundation
import os
import PassKit
import UIKit
import WatchConnectivity

private let log = Logger(subsystem: "io.metamask.MetaMask", category: "WalletExtension")

class MetaMaskWalletNonUIExtension: PKIssuerProvisioningExtensionHandler {
    override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
        let status = PKIssuerProvisioningExtensionStatus()
        let snapshot = readSnapshot()
        let installed = InstalledPasses.load()
        let phone = snapshot.map {
            ProvisioningLogic.cardsAvailable(cards: $0.cards, installed: installed.phone)
        } ?? []
        let watch = snapshot.map {
            ProvisioningLogic.cardsAvailable(cards: $0.cards, installed: installed.watch)
        } ?? []
        status.passEntriesAvailable = !phone.isEmpty
        let watchPaired = WCSession.isSupported() && WCSession.default.isPaired
        status.remotePassEntriesAvailable = watchPaired && !watch.isEmpty
        status.requiresAuthentication = true
        completion(status)
    }

    override func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
        Task {
            let entries = await WalletExtensionPasses.entries(remote: false)
            completion(entries)
        }
    }

    override func remotePassEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]) -> Void) {
        Task {
            let entries = await WalletExtensionPasses.entries(remote: true)
            completion(entries)
        }
    }

    override func generateAddPaymentPassRequestForPassEntryWithIdentifier(
        _ identifier: String,
        configuration: PKAddPaymentPassRequestConfiguration,
        certificateChain certificates: [Data],
        nonce: Data,
        nonceSignature: Data,
        completionHandler completion: @escaping (PKAddPaymentPassRequest?) -> Void
    ) {
        Task {
            let request = await WalletExtensionPasses.provision(
                identifier: identifier,
                certificates: certificates,
                nonce: nonce,
                nonceSignature: nonceSignature
            )
            completion(request)
        }
    }
}

private func provisioningDirectory() -> URL? {
    AppGroupLocator.containerURL()
}

private func readSnapshot() -> ProvisioningSnapshot? {
    guard let directory = provisioningDirectory() else { return nil }
    return SnapshotStore.read(directory: directory, defaults: UserDefaults(suiteName: AppGroupLocator.identifier))
}

enum InstalledPasses {
    static func load() -> (phone: [InstalledPass], watch: [InstalledPass]) {
        let library = PKPassLibrary()
        let phone = library.passes(of: .secureElement).compactMap { pass in
            (pass as? PKSecureElementPass).map(installed)
        }
        let watch = library.remoteSecureElementPasses.map(installed)
        return (phone, watch)
    }

    private static func installed(_ pass: PKSecureElementPass) -> InstalledPass {
        InstalledPass(
            primaryAccountIdentifier: pass.primaryAccountIdentifier,
            primaryAccountNumberSuffix: pass.primaryAccountNumberSuffix
        )
    }
}

enum WalletExtensionPasses {
    static func entries(remote: Bool) async -> [PKIssuerProvisioningExtensionPassEntry] {
        let deadline = Date().addingTimeInterval(18)
        guard let directory = provisioningDirectory() else { return [] }
        guard var snapshot = SnapshotStore.read(
            directory: directory,
            defaults: UserDefaults(suiteName: AppGroupLocator.identifier)
        ) else { return [] }
        guard await FlagsClient.isEnabled(snapshot: snapshot) else { return [] }
        if let tokens = await SessionRefresh.usableTokens(snapshot: snapshot, deadline: deadline),
           let base = URL(string: snapshot.apiBaseUrl) {
            let live = try? await liveCards(snapshot: snapshot, tokens: tokens, base: base)
            if let live, !live.isEmpty {
                snapshot.cards = live
                try? SnapshotStore.write(snapshot, directory: directory)
            }
        }
        let installed = InstalledPasses.load()
        let cards = ProvisioningLogic.cardsAvailable(
            cards: snapshot.cards,
            installed: remote ? installed.watch : installed.phone
        )
        guard let art = CardArt.load() else { return [] }
        return cards.compactMap { card in
            guard let configuration = configuration(for: card) else { return nil }
            return PKIssuerProvisioningExtensionPaymentPassEntry(
                identifier: card.entryId,
                title: card.title,
                art: art,
                addRequestConfiguration: configuration
            )
        }
    }

    static func provision(
        identifier: String,
        certificates: [Data],
        nonce: Data,
        nonceSignature: Data
    ) async -> PKAddPaymentPassRequest? {
        let deadline = Date().addingTimeInterval(18)
        guard let snapshot = readSnapshot() else {
            log.error("Provisioning snapshot unavailable")
            return nil
        }
        guard await FlagsClient.isEnabled(snapshot: snapshot) else {
            log.error("Provisioning flag disabled")
            return nil
        }
        guard let card = ProvisioningLogic.card(matching: identifier, in: snapshot.cards) else {
            log.error("Provisioning card not found")
            return nil
        }
        guard let tokens = await SessionRefresh.usableTokens(snapshot: snapshot, deadline: deadline) else {
            log.error("Provisioning session unavailable")
            return nil
        }
        guard let base = URL(string: snapshot.apiBaseUrl) else {
            log.error("Provisioning configuration invalid")
            return nil
        }
        let http = ProviderHTTP()
        do {
            let payload: ProvisioningPayload
            if snapshot.providerId == "baanx" {
                guard let clientKey = snapshot.baanxClientKey else {
                    log.error("Provisioning configuration invalid")
                    return nil
                }
                payload = try await BaanxClient.provision(
                    certificates: certificates,
                    nonce: nonce,
                    nonceSignature: nonceSignature,
                    tokens: tokens,
                    baseURL: base,
                    clientKey: clientKey,
                    http: http
                )
            } else {
                payload = try await ImmersveClient.provision(
                    cardId: card.cardId,
                    certificates: certificates,
                    nonce: nonce,
                    nonceSignature: nonceSignature,
                    tokens: tokens,
                    baseURL: base,
                    http: http
                )
            }
            let request = PKAddPaymentPassRequest()
            guard
                let encrypted = Data(base64Encoded: payload.encryptedPassData),
                let activation = Data(base64Encoded: payload.activationData),
                let ephemeral = Data(base64Encoded: payload.ephemeralPublicKey)
            else {
                log.error("Provisioning payload decode failed")
                return nil
            }
            request.encryptedPassData = encrypted
            request.activationData = activation
            request.ephemeralPublicKey = ephemeral
            log.info("Provisioning request created")
            return request
        } catch {
            logProvisioningFailure(error)
            return nil
        }
    }

    private static func liveCards(
        snapshot: ProvisioningSnapshot,
        tokens: CardTokenSet,
        base: URL
    ) async throws -> [SnapshotCard] {
        let http = ProviderHTTP()
        if snapshot.providerId == "baanx" {
            guard let clientKey = snapshot.baanxClientKey else { return snapshot.cards }
            if let card = try await BaanxClient.card(tokens: tokens, baseURL: base, clientKey: clientKey, http: http) {
                return [card]
            }
            return snapshot.cards
        }
        return try await ImmersveClient.cards(tokens: tokens, baseURL: base, http: http)
    }

    private static func configuration(for card: SnapshotCard) -> PKAddPaymentPassRequestConfiguration? {
        guard let configuration = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2) else {
            return nil
        }
        configuration.cardholderName = card.cardholderName
        configuration.primaryAccountSuffix = card.lastFour
        configuration.localizedDescription = card.localizedDescription
        configuration.paymentNetwork = .masterCard
        configuration.style = .payment
        if let identifier = card.primaryAccountIdentifier, !identifier.isEmpty {
            configuration.primaryAccountIdentifier = identifier
        }
        return configuration
    }
}

private enum CardArt {
    static let assetName = "MetaMaskCardArt"
    static let width = 1536
    static let height = 969

    static func load() -> CGImage? {
        guard let image = UIImage(named: assetName), let art = image.cgImage else {
            log.error("Card art unavailable")
            return nil
        }
        guard art.width == width, art.height == height else {
            log.error("Card art malformed")
            return nil
        }
        return art
    }
}

private func logProvisioningFailure(_ error: Error) {
    guard let providerError = error as? ProviderClientError else {
        log.error("Provisioning request failed")
        return
    }
    switch providerError {
    case let .http(status, errorCode):
        log.error("Provisioning provider request failed status=\(status, privacy: .public) code=\(errorCode ?? "none", privacy: .public)")
    case .invalidResponse:
        log.error("Provisioning provider response invalid")
    case .timeout:
        log.error("Provisioning provider request timed out")
    }
}
