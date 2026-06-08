# Real-world redaction failures

A private regression set of **famous, publicly-documented** redaction failures
(plus one true-negative control), run through the shipping analyzer to see what
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
lifted out from under black boxes.

| Document | Year | The documented failure | Our grade | Checks fired | Recovered | Detected? |
| --- | --- | --- | --- | --- | --- | --- |
| **TSA Screening Management SOP** | 2009 | 93-page manual posted to FedBizOpps with black boxes over live text; copy-paste revealed screening thresholds | **F** | superficial-mark ×25, metadata-leak, outline-leak, word-size | ~15,500 chars across 14+ pages | ✅ |
| **Manafort response** (*US v. Manafort*) | 2019 | Defense drew black boxes over the Kilimnik / 2016-campaign-polling-data passage (p.5); reporters copy-pasted it | **F** | superficial-mark ×32 (incl. p.5) | ~2,300 chars | ✅ |
| **USVI v. JPMorgan, Exhibit 1** (DoJ Epstein release) | 2022 | Failed redactions the PDF Association flagged on p.41; marks recoverable across the exhibit | **F** | superficial-mark ×71 (incl. p.41), metadata-leak | ~2,600 chars | ✅ |
| **EU–AstraZeneca APA** *(control)* | 2021 | The infamous copy leaked redacted section titles via PDF bookmarks — but it was online for only hours and was never archived | **A** | none | — | ✅ correctly clean |

Three famous failures, all graded **F** with text recovered from under the
marks; one famous case kept as a true-negative.

### Notes on the cases

- **TSA SOP** is the textbook government redaction failure (Schneier, Wired, The
  Register, 2009). One real document exercises four of our checks at once:
  superficial marks, leaked Title metadata, a leaked PDF bookmark
  (`outline-leak`), and a width-only `word-size` leak.
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

Sources for each document (and the SHA-256 we pin) are in
[`manifest.json`](./manifest.json).
