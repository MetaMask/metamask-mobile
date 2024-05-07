//
//  ViewController.m
//  TestClip
//
//  Created by Seth Kaufman on 5/6/24.
//  Copyright © 2024 MetaMask. All rights reserved.
//

#import "ViewController.h"

@interface ViewController ()

@end

@implementation ViewController

- (void)loadView {
// TODO - Blocked and getting this error (Undefined symbol: _OBJC_CLASS_$_RCTBundleURLProvider)
//  #if DEBUG
//  // For DEBUG configuration, javascript will be loaded from index file
//  NSURL *jsCodeLocation = [[RCTBundleURLProvider sharedSettings]
//jsBundleURLForBundleRoot:@"index"];
//  #else
//  // For RELEASE configuration, js code is bundled and main.jsbundle file is created
//  NSURL *jsCodeLocation = [[NSBundle mainBundle]
//URLForResource:@"main" withExtension:@"jsbundle"];
//  #endif
//
//  // Value of moduleName should be equal to appName value set in index file
//  RCTRootView *rootView = [[RCTRootView alloc]
//initWithBundleURL:jsCodeLocation moduleName:@"MetaMask"
//initialProperties:nil launchOptions:nil];
//  rootView.backgroundColor = [[UIColor alloc] initWithRed:1.0f
//green:1.0f blue:1.0f alpha:1];
//  self.view = rootView;
}

- (void)viewDidLoad {
    [super viewDidLoad];
    // Do any additional setup after loading the view.
}


@end
