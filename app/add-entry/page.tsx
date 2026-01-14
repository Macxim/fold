import { Sidebar } from "../components/sidebar";
import { EntryForm } from "../components/entry-form";

export default function AddEntryPage() {
  return (
    <div className="flex min-h-screen bg-background font-sans text-foreground selection:bg-accent selection:text-accent-foreground">
      <Sidebar />
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <header className="mb-12">
            <h2 className="text-muted-foreground text-xs md:text-sm uppercase tracking-widest mb-2 font-medium">Data Management</h2>
            <p className="text-2xl md:text-3xl font-light text-foreground tracking-tight">Add Assets</p>
        </header>

        <EntryForm />
      </main>
    </div>
  );
}
