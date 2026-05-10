import Foundation
import React
import UIKit
import UserNotifications

@objc(ScamShieldPush)
class ScamShieldPush: RCTEventEmitter {
  static var emitter: ScamShieldPush?
  private static var deviceToken: String?
  private static var pendingAlert = false
  private static var pendingTokenResolver: RCTPromiseResolveBlock?
  private static var pendingTokenRejecter: RCTPromiseRejectBlock?

  override init() {
    super.init()
    ScamShieldPush.emitter = self
  }

  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func supportedEvents() -> [String]! {
    ["ScamShieldPushToken", "ScamShieldScamAlert"]
  }

  @objc(requestPushToken:rejecter:)
  func requestPushToken(
    resolve: @escaping RCTPromiseResolveBlock,
    reject: @escaping RCTPromiseRejectBlock
  ) {
    DispatchQueue.main.async {
      if let token = ScamShieldPush.deviceToken {
        resolve(token)
        return
      }

      ScamShieldPush.pendingTokenResolver = resolve
      ScamShieldPush.pendingTokenRejecter = reject

      UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
        DispatchQueue.main.async {
          if let error = error {
            ScamShieldPush.rejectPendingToken(error)
            return
          }

          guard granted else {
            ScamShieldPush.rejectPendingToken("notification_permission_denied", "Notification permission was denied.")
            return
          }

          UIApplication.shared.registerForRemoteNotifications()
        }
      }
    }
  }

  @objc(consumePendingScamAlert:rejecter:)
  func consumePendingScamAlert(
    resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    let hadPendingAlert = ScamShieldPush.pendingAlert
    ScamShieldPush.pendingAlert = false
    resolve(hadPendingAlert)
  }

  static func handleDeviceToken(_ deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    self.deviceToken = token
    pendingTokenResolver?(token)
    pendingTokenResolver = nil
    pendingTokenRejecter = nil
    emitter?.sendEvent(withName: "ScamShieldPushToken", body: ["token": token])
  }

  static func handleDeviceTokenError(_ error: Error) {
    rejectPendingToken(error)
  }

  static func handleNotification(userInfo: [AnyHashable: Any]) {
    guard isScamAlert(userInfo: userInfo) else {
      return
    }

    if let emitter = emitter {
      emitter.sendEvent(withName: "ScamShieldScamAlert", body: userInfo)
    } else {
      pendingAlert = true
    }
  }

  static func isScamAlert(userInfo: [AnyHashable: Any]) -> Bool {
    userInfo["type"] as? String == "scam_alert"
  }

  private static func rejectPendingToken(_ error: Error) {
    pendingTokenRejecter?("push_registration_failed", error.localizedDescription, error)
    pendingTokenResolver = nil
    pendingTokenRejecter = nil
  }

  private static func rejectPendingToken(_ code: String, _ message: String) {
    pendingTokenRejecter?(code, message, nil)
    pendingTokenResolver = nil
    pendingTokenRejecter = nil
  }
}
