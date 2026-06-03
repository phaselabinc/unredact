import {SiteHeader} from '@/components/SiteHeader'
import {SiteFooter} from '@/components/SiteFooter'
import {Hero} from '@/components/sections/Hero'
import {VisualGuide} from '@/components/sections/VisualGuide'
import {Privacy} from '@/components/sections/Privacy'
import {TryIt} from '@/components/TryIt'

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <VisualGuide />

        <section
          id="try-it"
          className="border-b border-brand-almond/60 bg-brand-cream"
        >
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
            <div className="text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Try it yourself
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-brand-ink/70">
                Upload a PDF and we’ll check it for failed redactions on the
                spot. It never leaves your browser — so use any document you
                like.
              </p>
            </div>
            <div className="mt-10">
              <TryIt />
            </div>
          </div>
        </section>

        <Privacy />
      </main>
      <SiteFooter />
    </>
  )
}
