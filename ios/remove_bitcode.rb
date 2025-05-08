#!/usr/bin/env ruby

# Script to disable bitcode for OpenSSL in iOS builds
# This is needed because Apple no longer accepts apps with bitcode since Xcode 14

require 'xcodeproj'

def disable_bitcode_for_openssl(project_path)
  project = Xcodeproj::Project.open(project_path)
  
  project.targets.each do |target|
    if target.name.include?('OpenSSL')
      puts "⚙️ Disabling bitcode for target: #{target.name}"
      
      target.build_configurations.each do |config|
        config.build_settings['ENABLE_BITCODE'] = 'NO'
        config.build_settings['OTHER_CFLAGS'] = '$(inherited) -fembed-bitcode=no'
        
        puts "  ✅ Disabled bitcode for build configuration: #{config.name}"
      end
    end
  end
  
  project.save
  puts "✅ Successfully disabled bitcode for OpenSSL targets in #{project_path}"
end

# Find the OpenSSL pod project
pods_dir = File.expand_path('Pods', __dir__)
openssl_project_path = nil

Dir.glob("#{pods_dir}/**/*.xcodeproj").each do |project_path|
  if project_path.include?('OpenSSL') || project_path.include?('openssl')
    openssl_project_path = project_path
    break
  end
end

if openssl_project_path
  puts "🔍 Found OpenSSL project at: #{openssl_project_path}"
  disable_bitcode_for_openssl(openssl_project_path)
else
  puts "❌ Could not find OpenSSL project in Pods directory"
end

# Also ensure main project has bitcode disabled
main_project_path = File.expand_path('MetaMask.xcodeproj', __dir__)
if File.exist?(main_project_path)
  project = Xcodeproj::Project.open(main_project_path)
  project.targets.each do |target|
    puts "⚙️ Ensuring bitcode is disabled for target: #{target.name}"
    target.build_configurations.each do |config|
      config.build_settings['ENABLE_BITCODE'] = 'NO'
    end
  end
  project.save
  puts "✅ Disabled bitcode for all targets in main project"
else
  puts "❌ Could not find main project at: #{main_project_path}"
end 