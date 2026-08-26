# Vendored from https://github.com/sumsub/Specs/blob/master/IdensicMobileSDK/1.45.1/IdensicMobileSDK.podspec
# so we do not add a second global CocoaPods source (that breaks FirebaseCore /
# GzipSwift resolution against github.com/CocoaPods/Specs.git). The zip is
# public on maven.sumsub.com — no dashboard credentials or ~/.netrc.
Pod::Spec.new do |s|
  s.name = 'IdensicMobileSDK'
  s.version = '1.45.1'
  s.summary = 'Sumsub Mobile SDK'
  s.authors = 'Sumsub'
  s.homepage = 'https://sumsub.com/'
  s.license = { :type => 'Proprietary', :text => 'Copyright © Sumsub. All rights reserved.' }
  s.documentation_url = 'https://docs.sumsub.com/docs/get-started-ios'
  s.platform = :ios
  s.source = { :http => "https://maven.sumsub.com/repository/releases/IdensicMobileSDK-iOS/#{s.version}/IdensicMobileSDK-#{s.version}.zip" }
  s.swift_versions = ['5']

  s.ios.deployment_target = '13.0'
  s.default_subspec = 'Default'

  s.subspec 'Default' do |default|
    default.dependency 'IdensicMobileSDK/Core'
  end

  s.subspec 'Core' do |core|
    core.ios.vendored_frameworks = 'IdensicMobileSDK.xcframework'
  end
end
