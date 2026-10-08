import UIKit

/// The iOS privacy cover. `AppDelegate` shows it from
/// `applicationDidEnterBackground` and `PrivacyCoverModule` hides it once
/// resume routing resolves. Not shown for `inactive` (Control Center, the
/// app-switcher gesture).
///
/// Splash background plus the centered splash fox, matching the Android cover.
/// A separate window so it sits above native-stack modals.
@objc(PrivacyCover)
final class PrivacyCover: NSObject {
  @objc static let shared = PrivacyCover()

  private var coverWindow: UIWindow?
  private let foxSide: CGFloat = 144

  private override init() {
    super.init()
  }

  @objc func show(in host: UIWindow?) {
    let scene = coverWindow?.windowScene ?? host?.windowScene
    guard let scene else {
      return
    }
    let window = coverWindow ?? makeWindow(for: scene)
    window.frame = scene.coordinateSpace.bounds
    window.isHidden = false
  }

  @objc func hide() {
    coverWindow?.isHidden = true
  }

  private func makeWindow(for scene: UIWindowScene) -> UIWindow {
    let window = UIWindow(windowScene: scene)
    window.windowLevel = .alert + 1
    // This window is not a sibling of the wallet's views, so VoiceOver needs
    // the modal flag on the window itself to stay out of the app underneath.
    window.accessibilityViewIsModal = true
    let root = UIViewController()
    root.view.backgroundColor = UIColor(named: "splashBackground") ?? .systemBackground
    root.view.accessibilityViewIsModal = true

    let fox = UIImageView(image: UIImage(named: "fox-splash-screen"))
    fox.translatesAutoresizingMaskIntoConstraints = false
    fox.contentMode = .scaleAspectFit
    root.view.addSubview(fox)
    NSLayoutConstraint.activate([
      fox.centerXAnchor.constraint(equalTo: root.view.centerXAnchor),
      fox.centerYAnchor.constraint(equalTo: root.view.centerYAnchor),
      fox.widthAnchor.constraint(equalToConstant: foxSide),
      fox.heightAnchor.constraint(equalToConstant: foxSide),
    ])

    window.rootViewController = root
    coverWindow = window
    return window
  }
}
