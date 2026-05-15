import SwiftUI

struct SVGGalleryView: View {
    @State private var svgFiles: [URL] = []
    @State private var selectedFile: URL?

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
                        Text("Figgy validates your SVGs, no doubt")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                }
                .padding(.horizontal, 20)
                .padding(.vertical, 12)

                Divider()

                if svgFiles.isEmpty {
                    Spacer()
                    VStack(spacing: 12) {
                        Image(systemName: "photo.badge.exclamationmark")
                            .font(.largeTitle)
                            .foregroundColor(.secondary)
                        Text("No SVGs loaded")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    Spacer()
                } else {
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 120))], spacing: 16) {
                            ForEach(svgFiles, id: \.self) { file in
                                VStack {
                                    SVGImageView(url: file)
                                        .frame(width: 100, height: 100)
                                        .onTapGesture { selectedFile = file }
                                    Text(file.lastPathComponent)
                                        .font(.caption2)
                                        .lineLimit(1)
                                        .truncationMode(.middle)
                                }
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationBarHidden(true)
            .onAppear { loadSVGs() }
            .refreshable { loadSVGs() }
            .sheet(item: $selectedFile) { file in
                SVGDetailView(url: file)
            }
        }
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
