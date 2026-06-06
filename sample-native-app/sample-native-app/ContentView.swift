//
//  ContentView.swift — The AI Beta-Tester Swarm demo app (App-Under-Test)
//
//  A Notes/Tasks app (Epic 4, FR-11). Screen names match the swarm's finding
//  templates: NoteList, NoteDetail, Search. It deliberately carries a few
//  realistic, reproducible UI/UX edge cases for the swarm to discover (marked
//  `SEEDED EDGE CASE`). Kept believable — not obviously staged (SM-C2).
//

import SwiftUI
import Combine

struct Note: Identifiable, Equatable, Hashable {
    let id = UUID()
    var title: String
    var body: String
}

final class NotesStore: ObservableObject {
    @Published var notes: [Note] = []   // SEEDED empty_state: starts empty

    func add() {
        notes.insert(Note(title: "", body: ""), at: 0)
    }

    func seedLargeData() {
        notes = (1...10_000).map { Note(title: "Note \($0)", body: "Body for note \($0)") }
    }

    func delete(_ note: Note) {
        notes.removeAll { $0.id == note.id }
    }
}

struct ContentView: View {
    @StateObject private var store = NotesStore()

    var body: some View {
        NoteListScreen()
            .environmentObject(store)
    }
}

struct NoteListScreen: View {
    @EnvironmentObject var store: NotesStore
    @State private var query = ""

    var filtered: [Note] {
        query.isEmpty ? store.notes : store.notes.filter {
            $0.title.localizedCaseInsensitiveContains(query) ||
            $0.body.localizedCaseInsensitiveContains(query)
        }
    }

    var body: some View {
        NavigationStack {
            // SEEDED empty_state: when there are no notes we render a blank list
            // with no guidance/CTA (a real first-run pitfall).
            List {
                ForEach(filtered) { note in
                    NavigationLink(value: note) {
                        // SEEDED long_name_rtl: title is hard-clipped to a fixed
                        // width — long titles cut with no helpful affordance.
                        Text(note.title.isEmpty ? "Untitled" : note.title)
                            .lineLimit(1)
                            .truncationMode(.tail)
                            .frame(maxWidth: 240, alignment: .leading)
                            .clipped()
                    }
                }
            }
            .navigationTitle("Notes")
            .searchable(text: $query, prompt: "Search")   // Search screen
            .navigationDestination(for: Note.self) { note in
                NoteDetailScreen(note: note)
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    // SEEDED rapid_tap: no debounce — a fast double-tap adds two notes.
                    Button {
                        store.add()
                    } label: {
                        Image(systemName: "plus")   // SEEDED accessibility: no label
                    }
                    .accessibilityIdentifier("new-note")
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button("Seed 10k") { store.seedLargeData() }   // large_data
                }
            }
        }
    }
}

struct NoteDetailScreen: View {
    @EnvironmentObject var store: NotesStore
    @Environment(\.dismiss) private var dismiss
    @State var note: Note

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            TextField("Title", text: $note.title)
                .font(.title2)
            Divider()
            TextEditor(text: $note.body)

            // SEEDED tiny_screen: actions in a fixed-width HStack that can overflow
            // / overlap on the smallest devices.
            HStack {
                Button("Save") { saveAndClose() }
                    .buttonStyle(.borderedProminent)
                Spacer(minLength: 0)
                Button("Delete", role: .destructive) {
                    store.delete(note)
                    dismiss()
                }
                .buttonStyle(.bordered)
            }
            .frame(minWidth: 420)   // wider than small screens => clipping
        }
        .padding()
        .navigationTitle("Edit")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func saveAndClose() {
        if let i = store.notes.firstIndex(where: { $0.id == note.id }) {
            store.notes[i] = note
        }
        dismiss()
    }
}

#Preview {
    ContentView()
}
