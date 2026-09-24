Pod::Spec.new do |s|
  s.name           = 'TradeGlassMenu'
  s.version        = '1.0.0'
  s.summary        = 'Liquid Glass trade menu whose morph is animated by UIKit'
  s.description    = s.summary
  s.license        = 'MIT'
  s.author         = 'MetaMask'
  s.homepage       = 'https://github.com/MetaMask/metamask-mobile'
  s.platforms      = {
    :ios => '15.1'
  }
  s.source         = { git: 'https://github.com/MetaMask/metamask-mobile.git' }

  s.dependency 'ExpoModulesCore'

  s.static_framework = true
  s.source_files = '**/*.{h,m,swift}'
end
