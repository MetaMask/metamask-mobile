import Combine
import CoreText
import LocalAuthentication
import os
import PassKit
import SwiftUI
import UIKit

private let authLog = Logger(subsystem: "io.metamask.MetaMask", category: "WalletExtension")

class MetaMaskWalletUIExtension: UIViewController, PKIssuerProvisioningExtensionAuthorizationProviding {
    var completionHandler: ((PKIssuerProvisioningExtensionAuthorizationResult) -> Void)?
    private let model = AuthorizationModel()
    private var didFinish = false
    private var didStartAuthorization = false

    override func viewDidLoad() {
        super.viewDidLoad()
        FontRegistration.registerBundledFonts()
        let root = AuthorizationView(model: model) { [weak self] result in
            self?.finish(result)
        }
        let controller = UIHostingController(rootView: root)
        addChild(controller)
        controller.view.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(controller.view)
        NSLayoutConstraint.activate([
            controller.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            controller.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            controller.view.topAnchor.constraint(equalTo: view.topAnchor),
            controller.view.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])
        controller.didMove(toParent: self)
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        guard !didStartAuthorization else { return }
        didStartAuthorization = true
        model.start()
    }

    private func finish(_ result: PKIssuerProvisioningExtensionAuthorizationResult) {
        guard !didFinish else { return }
        didFinish = true
        completionHandler?(result)
    }
}

enum FontRegistration {
    static func registerBundledFonts() {
        let names = ["MMSans-Regular", "MMSans-Medium", "MMSans-Bold", "MMPoly-Regular"]
        for name in names {
            guard let url = Bundle.main.url(forResource: name, withExtension: "otf") else { continue }
            CTFontManagerRegisterFontsForURL(url as CFURL, .process, nil)
        }
    }
}

enum AuthorizationPhase {
    case checking
    case signInRequired
    case unavailable
    case verificationFailed
}

final class AuthorizationModel: ObservableObject {
    @Published var phase: AuthorizationPhase = .checking
    @Published var statusMessage = ""

    func start() {
        phase = .checking
        Task { await authenticateAndRefresh() }
    }

    func retry() {
        start()
    }

    private func authenticateAndRefresh() async {
        let context = LAContext()
        context.localizedCancelTitle = NSLocalizedString("Close", comment: "")
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else {
            logVerificationOutcome(error)
            await MainActor.run { phase = .verificationFailed }
            return
        }
        let success = await withCheckedContinuation { continuation in
            context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: NSLocalizedString("Verify it's you", comment: "")) { ok, evalError in
                if !ok {
                    logVerificationOutcome(evalError)
                }
                continuation.resume(returning: ok)
            }
        }
        guard success else {
            await MainActor.run { phase = .verificationFailed }
            return
        }
        guard let directory = AppGroupLocator.containerURL() else {
            await MainActor.run { phase = .unavailable }
            return
        }
        let deadline = Date().addingTimeInterval(18)
        guard let snapshot = SnapshotStore.read(
            directory: directory,
            defaults: UserDefaults(suiteName: AppGroupLocator.identifier)
        ) else {
            await MainActor.run { phase = .unavailable }
            return
        }
        guard await FlagsClient.isEnabled(snapshot: snapshot) else {
            await MainActor.run { phase = .unavailable }
            return
        }
        switch await SessionRefresh.usableTokens(snapshot: snapshot, deadline: deadline) {
        case .ready:
            await MainActor.run { finishAuthorized() }
        case .expired:
            SnapshotStore.clear(
                directory: directory,
                defaults: UserDefaults(suiteName: AppGroupLocator.identifier)
            )
            await MainActor.run { phase = .signInRequired }
        case .unavailable:
            await MainActor.run { phase = .signInRequired }
        }
    }

    private func finishAuthorized() {
        phase = .checking
        NotificationCenter.default.post(name: .walletExtensionAuthorized, object: nil)
    }
}

extension Notification.Name {
    static let walletExtensionAuthorized = Notification.Name("walletExtensionAuthorized")
}

private func logVerificationOutcome(_ error: Error?) {
    if let code = (error as? LAError)?.code.rawValue {
        authLog.error("Verification failed code=\(code, privacy: .public)")
    } else {
        authLog.error("Verification failed code=unknown")
    }
}

struct AuthorizationView: View {
    @ObservedObject var model: AuthorizationModel
    var onFinish: (PKIssuerProvisioningExtensionAuthorizationResult) -> Void

    var body: some View {
        ZStack {
            WalletColor.background.ignoresSafeArea()
            VStack(spacing: 24) {
                fox
                content
            }
            .padding(24)
        }
        .onReceive(NotificationCenter.default.publisher(for: .walletExtensionAuthorized)) { _ in
            onFinish(.authorized)
        }
    }

    @ViewBuilder
    private var content: some View {
        switch model.phase {
        case .checking:
            ProgressView()
                .tint(WalletColor.primary)
            Text("Checking your MetaMask Card")
                .font(WalletFont.body)
                .foregroundStyle(WalletColor.text)
        case .signInRequired, .unavailable:
            Text("Open the MetaMask app and sign in to your MetaMask Card, then return to Wallet.")
                .font(WalletFont.body)
                .multilineTextAlignment(.center)
                .foregroundStyle(WalletColor.text)
            primaryButton("Close") { cancel() }
        case .verificationFailed:
            Text("Verification failed or was canceled.")
                .font(WalletFont.body)
                .multilineTextAlignment(.center)
                .foregroundStyle(WalletColor.text)
            primaryButton("Try again") { model.retry() }
            secondaryButton("Close") { cancel() }
        }
    }

    private var fox: some View {
        Group {
            if let url = Bundle.main.url(forResource: "fox", withExtension: "png"),
               let data = try? Data(contentsOf: url),
               let image = UIImage(data: data) {
                Image(uiImage: image).resizable().frame(width: 72, height: 72)
            }
        }
    }

    private func cancel() {
        onFinish(.canceled)
    }

    private func primaryButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(WalletFont.button)
                .foregroundStyle(Color.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(WalletColor.primary)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .contentShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }

    private func secondaryButton(_ title: String, action: @escaping () -> Void) -> some View {
        Button(title, action: action)
            .font(WalletFont.body)
            .foregroundStyle(WalletColor.text)
    }
}

enum WalletColor {
    /// Light and dark values from `@metamask/design-tokens` 11.1.0
    /// (`background`, `text`, `primary`, and `error` `.default`).
    static let background = adaptive(light: 0xFFFFFF, dark: 0x000000)
    static let text = adaptive(light: 0x131416, dark: 0xFFFFFF)
    static let primary = adaptive(light: 0x4459FF, dark: 0x8B99FF)

    private static func adaptive(light: UInt32, dark: UInt32) -> Color {
        Color(uiColor: UIColor { traits in
            uiColor(traits.userInterfaceStyle == .dark ? dark : light)
        })
    }

    private static func uiColor(_ hex: UInt32) -> UIColor {
        UIColor(
            red: CGFloat((hex >> 16) & 0xFF) / 255,
            green: CGFloat((hex >> 8) & 0xFF) / 255,
            blue: CGFloat(hex & 0xFF) / 255,
            alpha: 1
        )
    }
}

enum WalletFont {
    static let body = Font.custom("MM Sans", size: 16)
    static let button = Font.custom("MM Sans", size: 16).weight(.medium)
}
