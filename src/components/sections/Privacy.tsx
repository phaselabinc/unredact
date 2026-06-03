import {FiCpu, FiSlash, FiSearch, FiAlertTriangle} from 'react-icons/fi'

const POINTS = [
  {
    Icon: FiCpu,
    title: 'It runs in your browser',
    body: 'The PDF is read and analyzed entirely on your device using WebAssembly. There is no “upload” step and no server that sees your file.',
  },
  {
    Icon: FiSlash,
    title: 'Nothing is stored',
    body: 'No accounts, no databases, no logs of your content. Close the tab and it’s gone. The only thing you can share is a screenshot you choose to make.',
  },
  {
    Icon: FiSearch,
    title: 'You can verify it',
    body: 'Open your browser’s network tab while you scan a document — you won’t see it leave. Our security policy blocks the page from sending file data anywhere.',
  },
  {
    Icon: FiAlertTriangle,
    title: 'It’s not a guarantee',
    body: 'A clean result means we didn’t find the failures we check for — not that a document is provably safe. For real matters, redact with tools built for it.',
  },
]

export function Privacy() {
  return (
    <section id="privacy" className="bg-brand-cream">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Your document never leaves your browser
          </h2>
          <p className="mt-4 text-lg text-brand-ink/70">
            This tool is public and anyone can use it — which is exactly why we
            built it to never receive your file in the first place.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {POINTS.map((p) => (
            <div
              key={p.title}
              className="flex gap-4 rounded-2xl border border-brand-almond bg-white p-6"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                <p.Icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-brand-ink/65">
                  {p.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
