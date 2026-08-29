import SwiftUI
import LocalAuthentication

@MainActor final class SecurityGate:ObservableObject {
    @Published var unlocked=false
    func lock(){unlocked=false}
    func unlock(){let context=LAContext();var error:NSError?;guard context.canEvaluatePolicy(.deviceOwnerAuthentication,error:&error) else {unlocked=true;return};context.evaluatePolicy(.deviceOwnerAuthentication,localizedReason:"Access your private matIQ records") { success,_ in Task{@MainActor in self.unlocked=success} }}
}
struct LockView:View {
    @EnvironmentObject var security:SecurityGate
    var body:some View { VStack(spacing:20){Image("AppIcon").resizable().frame(width:112,height:112).clipShape(RoundedRectangle(cornerRadius:24));Text("matIQ").font(.largeTitle.bold());Text("Athlete intelligence stays protected on this device.").multilineTextAlignment(.center).foregroundStyle(.secondary);Button("Unlock",systemImage:"faceid"){security.unlock()}.buttonStyle(.borderedProminent)}.padding().task{security.unlock()} }
}
