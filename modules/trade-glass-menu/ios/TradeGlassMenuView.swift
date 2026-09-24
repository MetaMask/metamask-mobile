import ExpoModulesCore

/// The button the menu grows out of, in this view's own coordinate space.
struct TradeGlassMenuAnchor: Record {
  @Field var x: Double = 0
  @Field var y: Double = 0
  @Field var width: Double = 0
  @Field var height: Double = 0

  var rect: CGRect {
    CGRect(x: x, y: y, width: width, height: height)
  }
}

enum TradeGlassMenuColorScheme: String, Enumerable {
  case auto
  case light
  case dark

  func toUIUserInterfaceStyle() -> UIUserInterfaceStyle {
    switch self {
    case .auto: return .unspecified
    case .light: return .light
    case .dark: return .dark
    }
  }
}

/**
 A Liquid Glass menu that grows its own frame out of the button that opened it.

 `UIGlassEffect` renders its refraction at the layer's size, so scaling the
 layer warps the material. UIKit animates the frame instead, off the React
 Native commit path, and the rows are laid out once at their final size and
 revealed by the growing clip.
 */
public final class TradeGlassMenuView: ExpoView {
  private let clipView = UIView()
  private let glassEffectView = UIVisualEffectView()
  private let contentView = UIView()

  private var glassEffect: Any?
  private var animator: UIViewPropertyAnimator?

  private var anchor: CGRect = .zero
  private var expandedHeight: CGFloat = 0
  private var horizontalInset: CGFloat = 16
  private var gap: CGFloat = 16
  private var menuCornerRadius: CGFloat = 24
  private var colorScheme: TradeGlassMenuColorScheme = .auto
  private var isOpen = false
  private var presentedOpen = false
  private var hasAnimated = false

  let onCollapsed = EventDispatcher()

  public required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)

    clipView.clipsToBounds = true
    clipView.layer.cornerCurve = .continuous
    glassEffectView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    // Keeps the rows pinned to the bottom edge as the clip grows upward.
    contentView.autoresizingMask = [.flexibleTopMargin]
    contentView.alpha = 0

    clipView.addSubview(glassEffectView)
    clipView.addSubview(contentView)
    addSubview(clipView)
  }

  // UIGlassEffect crashes on some iOS 26 betas, so probe before constructing it.
  // https://github.com/expo/expo/issues/40911
  private func isGlassEffectAvailable() -> Bool {
    #if compiler(>=6.2)
      if #available(iOS 26.0, *) {
        guard let glassEffectClass = NSClassFromString("UIGlassEffect") as? NSObject.Type else {
          return false
        }
        return glassEffectClass.responds(to: Selector(("effectWithStyle:")))
      }
    #endif
    return false
  }

  public override func layoutSubviews() {
    super.layoutSubviews()

    updateEffect()
    // Until the menu has animated, UIKit owns no in-flight geometry, so a
    // bounds change (rotation, keyboard) re-seats it rather than fighting it.
    if !hasAnimated {
      applyGeometry(open: false)
    }
    updateOpenState()
  }

  private var expandedRect: CGRect {
    CGRect(
      x: horizontalInset,
      y: anchor.minY - gap - expandedHeight,
      width: bounds.width - horizontalInset * 2,
      height: expandedHeight
    )
  }

  private func applyGeometry(open: Bool) {
    let frame = open ? expandedRect : anchor
    clipView.frame = frame
    clipView.layer.cornerRadius = open ? menuCornerRadius : anchor.height / 2
    contentView.frame = CGRect(
      x: 0,
      y: frame.height - expandedHeight,
      width: expandedRect.width,
      height: expandedHeight
    )
    contentView.alpha = open ? 1 : 0
  }

  private func updateEffect() {
    guard isGlassEffectAvailable() else {
      return
    }
    #if compiler(>=6.2)
      if #available(iOS 26.0, *) {
        if glassEffect == nil {
          glassEffect = UIGlassEffect(style: .regular)
        }
        glassEffectView.overrideUserInterfaceStyle = colorScheme.toUIUserInterfaceStyle()
        // Re-assigning is what makes UIKit pick the effect up.
        glassEffectView.effect = glassEffect as? UIGlassEffect
      }
    #endif
  }

  private func animate(open: Bool) {
    animator?.stopAnimation(true)

    // Reduce Motion keeps the crossfade but drops the travel, so the menu
    // appears where it belongs instead of flying there.
    if UIAccessibility.isReduceMotionEnabled {
      applyGeometry(open: true)
      UIView.animate(withDuration: open ? 0.14 : 0.09) {
        self.contentView.alpha = open ? 1 : 0
      } completion: { _ in
        if !open {
          self.onCollapsed()
        }
      }
      return
    }

    let animator: UIViewPropertyAnimator
    if open {
      // Response 0.35s at a 0.72 damping ratio: the SpringBoard context menu.
      let spring = UISpringTimingParameters(
        mass: 1,
        stiffness: 322,
        damping: 26,
        initialVelocity: .zero
      )
      animator = UIViewPropertyAnimator(duration: 0, timingParameters: spring)
    } else {
      animator = UIViewPropertyAnimator(duration: 0.18, curve: .easeIn)
    }

    animator.addAnimations {
      self.clipView.frame = open ? self.expandedRect : self.anchor
      self.clipView.layer.cornerRadius = open ? self.menuCornerRadius : self.anchor.height / 2
      self.contentView.frame = CGRect(
        x: 0,
        y: (open ? self.expandedRect.height : self.anchor.height) - self.expandedHeight,
        width: self.expandedRect.width,
        height: self.expandedHeight
      )
    }
    animator.addCompletion { position in
      guard position == .end, !open else {
        return
      }
      self.onCollapsed()
    }
    animator.startAnimation()
    self.animator = animator

    // The rows cross-fade at their final size, so labels never stretch.
    UIView.animate(withDuration: open ? 0.14 : 0.09) {
      self.contentView.alpha = open ? 1 : 0
    }
  }

  /// Runs once both the anchor and the measured height have arrived.
  private func updateOpenState() {
    guard expandedHeight > 0, anchor.height > 0, isOpen != presentedOpen else {
      return
    }
    if isOpen && !hasAnimated {
      applyGeometry(open: false)
    }
    presentedOpen = isOpen
    hasAnimated = true
    animate(open: isOpen)
  }

  func setAnchor(_ anchor: TradeGlassMenuAnchor?) {
    self.anchor = anchor?.rect ?? .zero
    setNeedsLayout()
  }

  func setExpandedHeight(_ height: CGFloat) {
    guard height != expandedHeight else {
      return
    }
    expandedHeight = height
    setNeedsLayout()
    updateOpenState()
  }

  func setHorizontalInset(_ inset: CGFloat) {
    horizontalInset = inset
    setNeedsLayout()
  }

  func setGap(_ gap: CGFloat) {
    self.gap = gap
    setNeedsLayout()
  }

  func setMenuCornerRadius(_ radius: CGFloat) {
    menuCornerRadius = radius
    setNeedsLayout()
  }

  func setColorScheme(_ colorScheme: TradeGlassMenuColorScheme) {
    guard colorScheme != self.colorScheme else {
      return
    }
    self.colorScheme = colorScheme
    updateEffect()
  }

  func setIsOpen(_ isOpen: Bool) {
    guard isOpen != self.isOpen else {
      return
    }
    self.isOpen = isOpen
    // Opening before the rows have measured would animate to a zero-height
    // menu, so the open waits for whichever of the two lands last.
    updateOpenState()
  }

  public override func mountChildComponentView(_ childComponentView: UIView, index: Int) {
    contentView.insertSubview(childComponentView, at: index)
  }

  public override func unmountChildComponentView(_ childComponentView: UIView, index: Int) {
    childComponentView.removeFromSuperview()
  }
}
