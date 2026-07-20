# Real-world redaction failures

A private regression set of **famous, publicly-documented** redaction failures
(plus true-negative controls), run through the shipping analyzer to see what
it catches. This is the real-world counterpart to the synthetic fixtures in
[`../`](../README.md).

> **The PDFs are not in the repo.** They contain the very content their failed
> redactions exposed — and we build redaction software, so committing
> improperly-disclosed third-party data is exactly the mistake this tool exists
> to catch. Only the PII-free [`manifest.json`](./manifest.json) (source URL +
> SHA-256 + expected counts) is tracked. Fetch the documents on demand:
>
> ```bash
> npm run examples:real   # downloads into this dir (gitignored), verifies SHA-256
> npm test                # the real-world cases run when present, skip when absent
> ```

## How we did

Results below are from the actual `extract → checks → grade` pipeline (via
`tests/real-examples.test.ts`), not a reimplementation. "Recovered" = characters
lifted out from under black boxes. Leak counts are **per passage**: consecutive
per-line redaction boxes are merged into one block finding, so a hidden paragraph
counts once (and reads back in full), not once per line.

| Document | Year | The documented failure | Our grade | Checks fired | Recovered | Detected? |
| --- | --- | --- | --- | --- | --- | --- |
| **Calipari / Sgrena AR 15-6 report** (US Army) | 2005 | Army investigation into the Baghdad checkpoint shooting posted with black boxes over classified text that stayed selectable; recovered within hours | **F** | superficial-mark across 12+ pages | hundreds of names/details | ✅ |
| **Manafort response** (*US v. Manafort*) | 2019 | Defense drew black boxes over the Kilimnik / 2016-campaign-polling-data passage (p.5); reporters copy-pasted it | **F** | superficial-mark (p.5 passage as one block) | ~1,975 chars over 4 pages | ✅ |
| **USVI v. JPMorgan, Exhibit 1** (DoJ Epstein release) | 2022 | Failed redactions the PDF Association flagged on p.41; marks recoverable across the exhibit | **F** | superficial-mark across 11 pages (incl. p.41) | ~2,400 chars | ✅ |
| **EU–AstraZeneca APA** *(control)* | 2021 | The infamous copy leaked redacted section titles via PDF bookmarks — but it was online for only hours and was never archived | **A** | none | — | ✅ correctly clean |
| **TSA Screening Management SOP** *(control)* | 2009 | This cryptome copy is a *reveal* edition: the once-hidden text is printed openly with a red outline around each passage — nothing is actually covered | **A** | none | — | ✅ correctly clean |

Three famous failures, all graded **F** with text recovered from under the marks;
two famous cases kept as true-negatives.

### Notes on the cases

- **Calipari / Sgrena report** is the textbook *government* redaction failure and
  the oldest case here (2005): the U.S. Army posted its AR 15-6 investigation with
  black boxes over classified passages, but the text stayed selectable and Italian
  press published the recovered content within hours. Hundreds of inline
  single-name/phrase redactions, so it exercises `superficial-mark` at volume.
- **Manafort** is the textbook *court-filing* failure — the famous January 2019
  pleading whose blacked-out text journalists recovered by copy-paste. We grab
  the forensically-confirmed copy (DocumentCloud `5677512`); the version on the
  public docket was later replaced with a properly-redacted one.
- **JPMorgan Exhibit 1** is the genuine defective redaction from the
  DoJ/Epstein-adjacent court records (the [PDF
  Association](https://pdfa.org/a-case-study-in-pdf-forensics-the-epstein-pdfs/)
  flagged page 41). Note the main Dec-2025 EFTA release was *correctly* redacted;
  the real failures are in older court exhibits like this one.
- **AstraZeneca** is a deliberate true-negative. The famous defect (redacted
  section titles readable in Adobe's Bookmarks tab, Jan 2021) lived in a copy
  that was online for only hours and never archived; Wayback's earliest capture
  is the **corrected reissue**. We keep it because a real, famous, *properly*
  redacted government contract is a strong false-positive guard — and our
  analyzer correctly grades it **A**.
- **TSA SOP** is the textbook government redaction failure (Schneier, Wired, The
  Register, 2009) — but the fetchable cryptome copy is a *reveal* edition: the
  once-hidden passages are printed as normal, fully-visible text, each wrapped in
  a red **outline** box (a clip path plus a red stroke, no dark fill). Nothing is
  covered, so **A** is correct. We keep it as a false-positive guard: the analyzer
  must not flag visible text just because a drawn box surrounds it — the exact
  case the clip-path handling in `extract.ts` exists to get right.

Sources for each document (and the SHA-256 we pin) are in
[`manifest.json`](./manifest.json).
