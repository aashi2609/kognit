export function SiteFooter() {
  return (
    <footer className="relative border-t border-white/5">
      <div className="pointer-events-none absolute inset-0 tactical-grid opacity-20" />
      <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-5 py-10 sm:flex-row sm:items-center sm:px-8">
        <div className="flex items-center gap-3">
          <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_var(--emerald-glow)]" />
          <span className="font-mono text-sm tracking-[0.3em] text-foreground">
            KOGNIT
          </span>
        </div>
        <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-muted-foreground/60">
          Understanding, reconstructed.
        </p>
      </div>
    </footer>
  )
}
