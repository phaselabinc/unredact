import {test, expect} from '@playwright/test'
import {join} from 'node:path'

const examplesDir = join(process.cwd(), 'examples')

// A representative slice of the example suite, with the alert text each upload
// should surface in the UI. (The full detection matrix is covered by the
// Vitest integration suite; this proves the real upload → analyze → alert flow
// works in a browser under the production CSP.)
const cases = [
  {
    file: '01-superficial-mark.pdf',
    grade: 'F',
    alert: /under the box/i,
  },
  {
    file: '03-multi-box-one-path.pdf',
    grade: 'F',
    alert: /under the box/i,
  },
  {
    file: '04-removable-redact-annotation.pdf',
    grade: 'F',
    alert: /removable redaction mark|un-applied/i,
  },
  {
    file: '02-word-size-leak.pdf',
    grade: 'B',
    alert: /leaks its length/i,
  },
  {
    file: '09-clean-control.pdf',
    grade: 'A',
    alert: /nothing leaked/i,
  },
]

test.describe('upload flow detects and alerts', () => {
  for (const c of cases) {
    test(`${c.file} → grade ${c.grade}`, async ({page}) => {
      const cspViolations: string[] = []
      page.on('console', (m) => {
        if (/content security policy|refused to/i.test(m.text())) {
          cspViolations.push(m.text())
        }
      })

      await page.goto('/')
      await page
        .locator('input[type=file]')
        .setInputFiles(`${examplesDir}/${c.file}`)

      // Results header appears once analysis (in the pdf.js worker) finishes.
      await expect(page.getByText('Redaction grade')).toBeVisible()
      await expect(
        page.locator(`[aria-label="Redaction grade ${c.grade}"]`)
      ).toBeVisible()

      // The specific alert for this document is shown.
      await expect(page.getByText(c.alert).first()).toBeVisible()

      // The strict CSP must not have blocked anything (worker, scripts, fonts).
      expect(cspViolations).toEqual([])
    })
  }

  test('recovered text reveals on demand', async ({page}) => {
    await page.goto('/')
    await page
      .locator('input[type=file]')
      .setInputFiles(`${examplesDir}/01-superficial-mark.pdf`)
    await expect(page.getByText('Redaction grade')).toBeVisible()

    // Recovered text is masked until the user clicks reveal.
    await page
      .getByRole('button', {name: /reveal what was under the box/i})
      .click()
    await expect(page.getByText('Jordan Hayes')).toBeVisible()
  })

  test('share / report modal opens from results', async ({page}) => {
    await page.goto('/')
    await page
      .locator('input[type=file]')
      .setInputFiles(`${examplesDir}/01-superficial-mark.pdf`)
    await expect(page.getByText('Redaction grade')).toBeVisible()
    await page.getByRole('button', {name: /see your report/i}).click()
    await expect(page.getByText('Your redaction report')).toBeVisible()
  })
})
