# Example documents

A suite of deliberately (mis)redacted PDFs, one per failure mode, plus a
correctly-redacted control. Drag any of them into the app to see it detected, or
let the test suite assert on them.

Regenerate with `npm run examples` (or `node examples/generate.mjs`). Each file
is hand-built and tiny; `manifest.json` records the expected outcome for each.

| File | What it demonstrates | Expected grade |
| --- | --- | --- |
| `01-superficial-mark.pdf` | A black box drawn over text that's still in the file | F |
| `02-word-size-leak.pdf` | A clean box whose width still leaks the hidden length | D |
| `03-multi-box-one-path.pdf` | Two redactions drawn as a single path (both still detected) | F |
| `04-removable-redact-annotation.pdf` | An un-applied `Redact` annotation | F |
| `05-removable-square-annotation.pdf` | A draggable black square annotation over text | F |
| `06-metadata-leak.pdf` | Clean body, but leaky Title/Author/Subject | C |
| `07-rotated-superficial.pdf` | A superficial mark on a rotated (`/Rotate 90`) page | F |
| `08-ocr-layer-leak.pdf` | Invisible text under a scanned-style full-page image | F |
| `09-clean-control.pdf` | Correctly redacted — should report **nothing** | A |

> These are synthetic test documents with fake data. They exist to exercise the
> checks; `09-clean-control.pdf` is the false-positive guard.
