import SwiftUI

struct TrackToggle: View {
    @Binding var isOn: Bool
    let leftLabel: String
    let rightLabel: String
    let leftIcon: String?
    let rightIcon: String?

    init(isOn: Binding<Bool>, leftLabel: String, rightLabel: String, leftIcon: String? = nil, rightIcon: String? = nil) {
        self._isOn = isOn
        self.leftLabel = leftLabel
        self.rightLabel = rightLabel
        self.leftIcon = leftIcon
        self.rightIcon = rightIcon
    }

    var body: some View {
        HStack(spacing: 6) {
            if let icon = leftIcon {
                Text(icon)
                    .font(.system(size: 14))
            } else {
                Text(leftLabel)
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }

            ZStack(alignment: isOn ? .trailing : .leading) {
                Capsule()
                    .fill(Color.secondary.opacity(0.25))
                    .frame(width: 40, height: 22)
                    .overlay(
                        Capsule()
                            .stroke(Color.secondary.opacity(0.3), lineWidth: 1)
                    )

                Circle()
                    .fill(Color(red: 0.169, green: 0.631, blue: 0.498))
                    .frame(width: 18, height: 18)
                    .padding(2)
            }
            .onTapGesture {
                withAnimation(.easeInOut(duration: 0.2)) {
                    isOn.toggle()
                }
            }

            if let icon = rightIcon {
                Text(icon)
                    .font(.system(size: 14))
            } else {
                Text(rightLabel)
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct SVGGalleryView: View {
    @State private var svgFiles: [URL] = []
    @State private var isLightMode = false
    @State private var showDebugBg = false

    private var surfaceColor: Color {
        isLightMode ? Color(red: 0.953, green: 0.965, blue: 0.973) : Color(red: 0.067, green: 0.094, blue: 0.153)
    }

    var body: some View {
        NavigationView {
            VStack(spacing: 0) {
                HStack(spacing: 10) {
                    Image("Figgy")
                        .resizable()
                        .frame(width: 36, height: 36)
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Figgity")
                            .font(.headline)
                        Text("Figgy validates your SVGs for iOS, no doubt")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                    TrackToggle(
                        isOn: $isLightMode,
                        leftLabel: "",
                        rightLabel: "",
                        leftIcon: "🌙",
                        rightIcon: "☀️"
                    )
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)

                Divider()

                if svgFiles.isEmpty {
                    Spacer()
                    VStack(spacing: 6) {
                        Text("No components loaded")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        Text("Use the Figgity GUI to push SVGs here")
                            .font(.caption)
                            .foregroundColor(.secondary.opacity(0.7))
                    }
                    Spacer()
                } else if svgFiles.count == 1 {
                    VStack(spacing: 12) {
                        Text(svgFiles[0].lastPathComponent)
                            .font(.caption)
                            .foregroundColor(.secondary)

                        SVGImageView(url: svgFiles[0])
                            .frame(maxWidth: .infinity)
                            .aspectRatio(contentMode: .fit)
                            .background(showDebugBg ? Color.red.opacity(0.15) : Color.clear)
                    }
                    .padding(20)
                    Spacer()
                } else {
                    ScrollView {
                        VStack(spacing: 0) {
                            ForEach(svgFiles, id: \.self) { file in
                                VStack(spacing: 12) {
                                    Text(file.lastPathComponent)
                                        .font(.caption)
                                        .foregroundColor(.secondary)

                                    SVGImageView(url: file)
                                        .frame(maxWidth: .infinity)
                                        .aspectRatio(contentMode: .fit)
                                        .background(showDebugBg ? Color.red.opacity(0.15) : Color.clear)
                                }
                                .frame(maxWidth: .infinity)
                                .padding(20)
                                            }
                        }
                    }
                }

                Divider()

                HStack(spacing: 8) {
                    TrackToggle(
                        isOn: $showDebugBg,
                        leftLabel: "",
                        rightLabel: "Show troubleshooting background"
                    )
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 10)
            }
            .background(surfaceColor)
            .navigationBarHidden(true)
            .onAppear { loadSVGs() }
            .refreshable { loadSVGs() }
        }
        .preferredColorScheme(isLightMode ? .light : .dark)
    }

    private func loadSVGs() {
        guard let docsDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first else {
            NSLog("[SVGPreview] No documents directory found")
            return
        }
        NSLog("[SVGPreview] Documents dir: %@", docsDir.path)
        let files = (try? FileManager.default.contentsOfDirectory(at: docsDir, includingPropertiesForKeys: nil)) ?? []
        NSLog("[SVGPreview] Found %d files total", files.count)
        svgFiles = files.filter { $0.pathExtension.lowercased() == "svg" }.sorted { $0.lastPathComponent < $1.lastPathComponent }
        NSLog("[SVGPreview] Found %d SVG files", svgFiles.count)
    }
}

extension URL: @retroactive Identifiable {
    public var id: String { absoluteString }
}
