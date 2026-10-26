import Foundation
import WebKit
import UIKit

/// Everything the page asks of the phone: keeping its data in a file, sharing a backup, haptics, and the
/// alert and confirm dialogs a browser would normally draw.
final class Bridge: NSObject, WKScriptMessageHandler, WKUIDelegate, WKNavigationDelegate {
    weak var webView: WKWebView?
    private let store = FileStore()

    /// Injected before the page runs: window.cook99Storage, a localStorage-like object backed by the app's file.
    func storageScript() -> String {
        let json = (try? JSONSerialization.data(withJSONObject: store.values)) ?? Data("{}".utf8)
        let b64 = json.base64EncodedString()
        return """
        (function(){
          const bytes=Uint8Array.from(atob('\(b64)'),c=>c.charCodeAt(0));
          const data=new Map(Object.entries(JSON.parse(new TextDecoder().decode(bytes))));
          const post=(key,value)=>window.webkit.messageHandlers.native.postMessage({type:'store',key,value});
          window.cook99Storage={
            getItem:k=>data.has(String(k))?data.get(String(k)):null,
            setItem:(k,v)=>{k=String(k);v=String(v);data.set(k,v);post(k,v);},
            removeItem:k=>{k=String(k);data.delete(k);post(k,null);},
            key:i=>[...data.keys()][i]??null,
            get length(){return data.size;}
          };
        })();
        """
    }

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any], let type = body["type"] as? String else { return }
        switch type {
        case "store":
            guard let key = body["key"] as? String else { return }
            store.set(key, body["value"] as? String)
        case "export":
            share(name: body["name"] as? String ?? "cook99.json", text: body["text"] as? String ?? "")
        case "haptic":
            levelUpHaptics()
        default:
            break
        }
    }

    // A backup goes out through the share sheet: Save to Files, AirDrop, Mail.
    private func share(name: String, text: String) {
        let file = FileManager.default.temporaryDirectory.appendingPathComponent(name)
        do { try Data(text.utf8).write(to: file, options: .atomic) } catch { return }
        let sheet = UIActivityViewController(activityItems: [file], applicationActivities: nil)
        if let view = webView {
            sheet.popoverPresentationController?.sourceView = view
            sheet.popoverPresentationController?.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.maxY - 80, width: 1, height: 1)
        }
        topController()?.present(sheet, animated: true)
    }

    // Taps in time with the jingle's pickup, then a firm success on the landing chord.
    private func levelUpHaptics() {
        let tap = UIImpactFeedbackGenerator(style: .light), land = UINotificationFeedbackGenerator()
        tap.prepare(); land.prepare()
        for (i, delay) in [0.0, 0.09, 0.18, 0.36].enumerated() {
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { tap.impactOccurred(intensity: 0.5 + Double(i) * 0.15) }
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.12) { land.notificationOccurred(.success) }
    }

    // alert() and confirm() from the page, drawn as native alerts.
    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler() })
        topController()?.present(alert, animated: true) ?? completionHandler()
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String, initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "OK", style: .default) { _ in completionHandler(true) })
        topController()?.present(alert, animated: true) ?? completionHandler(false)
    }

    // Links to anywhere outside the app open in Safari instead of replacing the app.
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if let url = action.request.url, let scheme = url.scheme, ["http", "https", "mailto"].contains(scheme) {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    private func topController() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first
        var top = scene?.windows.first(where: \.isKeyWindow)?.rootViewController
        while let next = top?.presentedViewController { top = next }
        return top
    }
}

/// The app's data: a small JSON file of key → text in Application Support, written atomically on every change.
/// It is included in the phone's iCloud or computer backups.
final class FileStore {
    private(set) var values: [String: String] = [:]
    private let url: URL

    init() {
        let dir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        url = dir.appendingPathComponent("cook99-storage.json")
        if let data = try? Data(contentsOf: url), let saved = try? JSONSerialization.jsonObject(with: data) as? [String: String] {
            values = saved
        }
    }

    func set(_ key: String, _ value: String?) {
        values[key] = value
        if let data = try? JSONSerialization.data(withJSONObject: values) { try? data.write(to: url, options: .atomic) }
    }
}
