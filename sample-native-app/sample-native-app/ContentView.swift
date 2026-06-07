//
//  ContentView.swift — The AI Beta-Tester Swarm demo app (App-Under-Test)
//
//  A richer Notes / Tasks / Settings app (Epic 4, FR-11) so the swarm has real
//  surface to explore and produce detailed reports. Screen names match the
//  finding templates: NoteList, NoteDetail, Search, Tasks, Settings. It carries
//  realistic, reproducible UI/UX edge cases (marked `SEEDED`) across the battery —
//  believable, not obviously staged (SM-C2).
//

import SwiftUI
import Combine

struct Note: Identifiable, Equatable, Hashable {
    let id = UUID()
    var title: String
    var body: String
    var tag: String = "General"
}

struct Task: Identifiable, Equatable, Hashable {
    let id = UUID()
    var title: String
    var done: Bool = false
}

final class AppStore: ObservableObject {
    @Published var notes: [Note]
    @Published var tasks: [Task]
    @Published var signedIn = true
    @Published var syncing = false

    init() {
        // Demo data so the app has real content to explore + show.
        notes = [
            Note(title: "Welcome to Notebook", body: "Tap + to add a note, swipe to delete, and use Search to find anything.", tag: "Getting Started"),
            Note(title: "Weekly grocery list with produce, dairy, and pantry staples that will not fit on one line", body: "Milk, eggs, bread, spinach, coffee, rice, olive oil, tomatoes, yogurt, bananas.", tag: "Personal"),
            Note(title: "Q3 planning", body: "Roadmap themes, hiring plan, and OKRs for the next quarter.", tag: "Work"),
            Note(title: "Book recommendations", body: "Designing Data-Intensive Applications; The Mom Test; Shape Up.", tag: "Personal"),
            Note(title: "Standup notes — June 6", body: "Shipped the live swarm; next: reporting polish and demo prep.", tag: "Work"),
            Note(title: "Trip ideas", body: "Kyoto in autumn, Lisbon in spring, a long weekend in the mountains.", tag: "Personal"),
        ]
        tasks = [
            Task(title: "Review the latest pull request"),
            Task(title: "Prepare the demo script", done: true),
            Task(title: "Email the design feedback"),
            Task(title: "Book the team lunch", done: true),
        ]
    }

    func addNote() { notes.insert(Note(title: "", body: ""), at: 0) }
    func seedLargeData() { notes = (1...10_000).map { Note(title: "Note \($0)", body: "Body for note number \($0) with some content.") } }
    func deleteNote(_ n: Note) { notes.removeAll { $0.id == n.id } }
    func addTask(_ t: String) { if !t.isEmpty { tasks.append(Task(title: t)) } }
    func clearCompleted() { tasks.removeAll { $0.done } }
}

struct ContentView: View {
    @StateObject private var store = AppStore()
    var body: some View {
        TabView {
            NotesTab().tabItem { Label("Notes", systemImage: "note.text") }
            TasksTab().tabItem { Label("Tasks", systemImage: "checklist") }
            SettingsTab().tabItem { Label("Settings", systemImage: "gearshape") }
        }
        .environmentObject(store)
    }
}

// MARK: - Notes
struct NotesTab: View {
    @EnvironmentObject var store: AppStore
    @State private var query = ""

    var filtered: [Note] {
        query.isEmpty ? store.notes : store.notes.filter {
            $0.title.localizedCaseInsensitiveContains(query) || $0.body.localizedCaseInsensitiveContains(query)
        }
    }

    var body: some View {
        NavigationStack {
            // SEEDED empty_state: a blank list with no guidance/CTA on first run.
            List {
                ForEach(filtered) { note in
                    NavigationLink(value: note) {
                        VStack(alignment: .leading, spacing: 2) {
                            // SEEDED long_name_rtl: title hard-clipped at a fixed width.
                            Text(note.title.isEmpty ? "Untitled" : note.title)
                                .font(.headline)
                                .lineLimit(1)
                                .frame(maxWidth: 240, alignment: .leading)
                                .clipped()
                            // SEEDED overflow: preview can run past the row.
                            Text(note.body).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                        }
                    }
                }
            }
            .navigationTitle("Notes")
            .searchable(text: $query, prompt: "Search notes")
            .navigationDestination(for: Note.self) { NoteDetailView(note: $0) }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    // SEEDED rapid_tap: no debounce — double-tap creates duplicates.
                    Button { store.addNote() } label: { Image(systemName: "plus") } // SEEDED accessibility: no label
                        .accessibilityIdentifier("new-note")
                }
                ToolbarItem(placement: .topBarLeading) {
                    Button("Seed 10k") { store.seedLargeData() } // SEEDED large_data
                }
            }
        }
    }
}

struct NoteDetailView: View {
    @EnvironmentObject var store: AppStore
    @Environment(\.dismiss) private var dismiss
    @State var note: Note

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            TextField("Title", text: $note.title).font(.title2)
            TextField("Tag", text: $note.tag).font(.subheadline).foregroundStyle(.secondary)
            Divider()
            TextEditor(text: $note.body)
            // SEEDED tiny_screen: fixed-width action row overflows small devices.
            HStack {
                Button("Save") { save() }.buttonStyle(.borderedProminent)
                Spacer(minLength: 0)
                Button("Delete", role: .destructive) { store.deleteNote(note); dismiss() }.buttonStyle(.bordered)
            }
            .frame(minWidth: 420)
        }
        .padding()
        .navigationTitle("Edit").navigationBarTitleDisplayMode(.inline)
    }
    private func save() {
        if let i = store.notes.firstIndex(where: { $0.id == note.id }) { store.notes[i] = note }
        dismiss()
    }
}

// MARK: - Tasks
struct TasksTab: View {
    @EnvironmentObject var store: AppStore
    @State private var newTask = ""

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                HStack {
                    TextField("New task", text: $newTask)
                    // SEEDED accessibility: icon-only add with no label.
                    Button { store.addTask(newTask); newTask = "" } label: { Image(systemName: "plus.circle.fill") }
                }.padding()
                List {
                    ForEach($store.tasks) { $task in
                        HStack {
                            Button { task.done.toggle() } label: {
                                Image(systemName: task.done ? "checkmark.circle.fill" : "circle")
                            }.buttonStyle(.plain)
                            Text(task.title).strikethrough(task.done).foregroundStyle(task.done ? .secondary : .primary)
                        }
                    }
                }
            }
            .navigationTitle("Tasks")
            .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("Clear done") { store.clearCompleted() } } }
        }
    }
}

// MARK: - Settings (auth / sync edge cases)
struct SettingsTab: View {
    @EnvironmentObject var store: AppStore
    var body: some View {
        NavigationStack {
            Form {
                Section("Account") {
                    HStack { Text("Status"); Spacer(); Text(store.signedIn ? "Signed in" : "Signed out").foregroundStyle(.secondary) }
                    // SEEDED auth_expiry: "sign out" then any sync shows a raw error path.
                    Button(store.signedIn ? "Sign out" : "Sign in") { store.signedIn.toggle() }
                }
                Section("Sync") {
                    // SEEDED slow_network: sync spins with no timeout/feedback.
                    Button { store.syncing = true } label: {
                        HStack { Text("Sync now"); if store.syncing { Spacer(); ProgressView() } }
                    }
                }
                Section("Data") {
                    Button("Seed 10,000 notes") { store.seedLargeData() }
                    Button("Delete all notes", role: .destructive) { store.notes.removeAll() }
                }
            }
            .navigationTitle("Settings")
        }
    }
}

#Preview { ContentView() }
