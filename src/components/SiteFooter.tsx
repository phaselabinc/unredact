import {FiExternalLink, FiGithub} from 'react-icons/fi'
import {BrandGlyph} from './Logo'

const GITHUB_URL = 'https://github.com/phaselabinc/unredact'

export function SiteFooter() {
  return (
    <footer className="border-t border-brand-almond/70 bg-brand-ink text-brand-cream">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <BrandGlyph className="h-7 w-7 text-brand-vermillion" />
              <span className="text-lg font-bold">unredact</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-brand-cream/70">
              An experiment by{' '}
              <a
                href="https://phase.law"
                className="font-medium text-brand-cream underline decoration-brand-vermillion underline-offset-2"
                target="_blank"
                rel="noopener noreferrer"
              >
                phaselaw
              </a>
              . We build ediscovery &amp; DSAR software that helps legal and HR
              teams redact documents the right way, so the black box actually
              means something.
            </p>
            <a
              href="https://www.phase.law/get-started"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-sm mt-5 rounded-xl normal-case"
            >
              Book a demo
            </a>
          </div>

          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <h3 className="mb-3 font-semibold uppercase tracking-wide text-brand-cream/50">
                This tool
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    className="text-brand-cream/80 hover:text-brand-cream"
                    href="#how-redactions-fail"
                  >
                    How redactions fail
                  </a>
                </li>
                <li>
                  <a
                    className="text-brand-cream/80 hover:text-brand-cream"
                    href="#try-it"
                  >
                    Check a PDF
                  </a>
                </li>
                <li>
                  <a
                    className="text-brand-cream/80 hover:text-brand-cream"
                    href="#privacy"
                  >
                    Privacy &amp; security
                  </a>
                </li>
                <li>
                  <a
                    className="inline-flex items-center gap-1 text-brand-cream/80 hover:text-brand-cream"
                    href={GITHUB_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Source code <FiGithub className="h-3 w-3" />
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-3 font-semibold uppercase tracking-wide text-brand-cream/50">
                phaselaw
              </h3>
              <ul className="space-y-2">
                <li>
                  <a
                    className="inline-flex items-center gap-1 text-brand-cream/80 hover:text-brand-cream"
                    href="https://www.phase.law"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    phase.law <FiExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <a
                    className="inline-flex items-center gap-1 text-brand-cream/80 hover:text-brand-cream"
                    href="https://www.phase.law/product"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Product <FiExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <a
                    className="inline-flex items-center gap-1 text-brand-cream/80 hover:text-brand-cream"
                    href="https://www.phase.law/get-started"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Book a demo <FiExternalLink className="h-3 w-3" />
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-brand-cream/15 pt-6 text-xs text-brand-cream/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Phaselab Inc. (dba phaselaw).</p>
          <p>
            Educational tool. We don&apos;t store your files. Don&apos;t upload
            documents you aren&apos;t allowed to.
          </p>
        </div>
      </div>
    </footer>
  )
}
