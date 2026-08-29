import SwiftUI
import WebKit

struct ContentView: View {
    @State private var route = URL(string:"https://matiq-youth-bjj.apex-governa-8920.chatgpt.site")!
    var body: some View {
        NavigationStack {
            MatIQWebView(url: route)
                .ignoresSafeArea(.container, edges: .bottom)
                .navigationTitle("matIQ")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItemGroup(placement:.bottomBar) {
                        Button("Home",systemImage:"house") { route=URL(string:"https://matiq-youth-bjj.apex-governa-8920.chatgpt.site")! }
                        Spacer()
                        Button("Portfolio",systemImage:"trophy") { route=URL(string:"https://matiq-youth-bjj.apex-governa-8920.chatgpt.site/portfolio")! }
                        Spacer()
                        Button("Network",systemImage:"person.3") { route=URL(string:"https://matiq-youth-bjj.apex-governa-8920.chatgpt.site/network")! }
                        Spacer()
                        ShareLink(item:route) { Label("Share",systemImage:"square.and.arrow.up") }
                    }
                }
        }
    }
}

struct MatIQWebView:UIViewRepresentable {
    let url:URL
    func makeUIView(context:Context)->WKWebView { let config=WKWebViewConfiguration();config.allowsInlineMediaPlayback=true;config.mediaTypesRequiringUserActionForPlayback=[];let view=WKWebView(frame:.zero,configuration:config);view.allowsBackForwardNavigationGestures=true;return view }
    func updateUIView(_ view:WKWebView,context:Context){if view.url != url { view.load(URLRequest(url:url,cachePolicy:.reloadRevalidatingCacheData)) }}
}
