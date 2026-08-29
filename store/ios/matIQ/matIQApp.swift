import SwiftUI

@main struct matIQApp: App {
    @StateObject private var security = SecurityGate()
    var body: some Scene {
        WindowGroup {
            Group {
                if security.unlocked { ContentView() }
                else { LockView().environmentObject(security) }
            }
            .onReceive(NotificationCenter.default.publisher(for: UIApplication.willResignActiveNotification)) { _ in security.lock() }
        }
    }
}
