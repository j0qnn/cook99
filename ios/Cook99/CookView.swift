import SwiftUI
import WebKit
import UIKit

/// Hosts the web app. Files come from the app bundle through a private URL scheme (cook99://app/), so ES modules,
/// fonts and the like load with proper types and no network. Saving, exporting and haptics go through `Bridge`.
struct CookView: UIViewRepresentable {
    func makeCoordinator() -> Bridge { Bridge() }

    func makeUIView(context: Context) -> WKWebView {
        let bridge = context.coordinator
        let config = WKWebViewConfiguration()
        config.setURLSchemeHandler(BundledFiles(), forURLScheme: "cook99")
        config.mediaTypesRequiringUserActionForPlayback = []
        config.allowsInlineMediaPlayback = true
        let scripts = config.userContentController
        scripts.add(bridge, name: "native")
        scripts.addUserScript(WKUserScript(source: bridge.storageScript(), injectionTime: .atDocumentStart, forMainFrameOnly: true))

        let web = WKWebView(frame: .zero, configuration: config)
        web.isOpaque = false
        web.backgroundColor = UIColor(named: "Background")
        web.scrollView.backgroundColor = UIColor(named: "Background")
        web.scrollView.contentInsetAdjustmentBehavior = .never   // the page handles safe areas itself (viewport-fit=cover)
        web.uiDelegate = bridge
        web.navigationDelegate = bridge
        if #available(iOS 16.4, *) { web.isInspectable = true }  // Safari > Develop can inspect it while testing
        bridge.webView = web
        web.load(URLRequest(url: URL(string: "cook99://app/index.html")!))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

/// Serves files from the bundled Web folder. Query strings (?v=18) are ignored; types are set by extension.
final class BundledFiles: NSObject, WKURLSchemeHandler {
    private let root = Bundle.main.resourceURL!.appendingPathComponent("Web", isDirectory: true)
    private let types = ["html": "text/html; charset=utf-8", "js": "text/javascript; charset=utf-8", "css": "text/css; charset=utf-8",
                         "json": "application/json", "webmanifest": "application/manifest+json", "svg": "image/svg+xml",
                         "png": "image/png", "ttf": "font/ttf", "txt": "text/plain; charset=utf-8"]

    func webView(_ webView: WKWebView, start task: WKURLSchemeTask) {
        guard let url = task.request.url else { return }
        var path = url.path.isEmpty || url.path == "/" ? "index.html" : String(url.path.dropFirst())
        path = path.removingPercentEncoding ?? path
        let file = root.appendingPathComponent(path).standardizedFileURL
        guard file.path.hasPrefix(root.standardizedFileURL.path), let data = try? Data(contentsOf: file) else {
            task.didReceive(HTTPURLResponse(url: url, statusCode: 404, httpVersion: "HTTP/1.1", headerFields: nil)!)
            task.didFinish()
            return
        }
        let type = types[file.pathExtension.lowercased()] ?? "application/octet-stream"
        task.didReceive(HTTPURLResponse(url: url, statusCode: 200, httpVersion: "HTTP/1.1",
                                        headerFields: ["Content-Type": type, "Content-Length": "\(data.count)", "Cache-Control": "no-cache"])!)
        task.didReceive(data)
        task.didFinish()
    }

    func webView(_ webView: WKWebView, stop task: WKURLSchemeTask) {}
}
