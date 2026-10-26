# Cook99 for iPhone

A native iPhone app that bundles the Cook99 web app from the folder above: offline, no browser, its own icon, data in a
file the app owns (`Application Support/cook99-storage.json`, included in phone backups). Native extras: haptics on a
level-up, the share sheet for backups, native alert and confirm dialogs. The web files are copied into the app on every
build, so one codebase serves both.

`project.yml` describes the project; regenerate `Cook99.xcodeproj` with `xcodegen` after changing it.

## Put it on your iPhone (personal use, no App Store)

1. Install **Xcode** from the Mac App Store (about 3–4 GB to download, around 12 GB installed). Open it once and accept
   the licence. You do not need the iOS Simulator; skip extra platforms to save space.
2. Xcode → Settings → Accounts → **+** → Apple ID. A free Apple ID works.
3. Connect the iPhone with a cable, unlock it, and tap **Trust This Computer**.
4. On the iPhone: Settings → Privacy & Security → **Developer Mode** → on, then restart it. (The switch appears after
   the phone has been connected to Xcode once.)
5. Open `Cook99.xcodeproj`, select the Cook99 target → Signing & Capabilities → **Team**: your Apple ID. If the bundle ID
   `com.j0qnn.cook99` is taken, change it to anything unique.
6. Choose your iPhone at the top and press **Run** (⌘R).
7. First launch only: on the iPhone, Settings → General → VPN & Device Management → trust your developer certificate.

With a free Apple ID the app stops opening after **7 days**: plug in and press Run again, your data stays. A paid
Apple Developer account (99 USD a year) makes it last a year and later allows TestFlight and the App Store.

## Bring your existing data across

In the browser version: Ledger → Settings → **Export**, save the file to Files. In the app: Ledger → Settings →
**Import**, pick that file.
