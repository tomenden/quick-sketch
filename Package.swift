// swift-tools-version: 6.2
import PackageDescription

let package = Package(
    name: "quick-sketch",
    platforms: [
        .macOS(.v14),
    ],
    targets: [
        .executableTarget(
            name: "quick-sketch"
        ),
    ]
)
