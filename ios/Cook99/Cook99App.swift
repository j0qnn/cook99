import SwiftUI

// Cook99 for iPhone: a native shell around the same web app, bundled inside, offline, with its data in a file the app owns.
@main
struct Cook99App: App {
    var body: some Scene {
        WindowGroup {
            CookView()
                .ignoresSafeArea()
                .background(Color("Background"))
        }
    }
}
