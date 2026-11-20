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
    await page.getByRole('button', {name: 'Reveal text for area 1'}).click()
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

  test('groups each page and shows every distinct finding in one preview', async ({
    page,
  }) => {
    await page.goto('/')
    await page
      .locator('input[type=file]')
      .setInputFiles(`${examplesDir}/12-page-findings.pdf`)
    const first = page.getByRole('region', {
      name: 'Problems on page 1',
      exact: true,
    })
    const second = page.getByRole('region', {
      name: 'Problems on page 2',
      exact: true,
    })
    await expect(
      page.getByRole('region', {name: /Problems on page/})
    ).toHaveCount(2)
    await expect(first.getByText('4 findings', {exact: true})).toBeVisible()
    await expect(second.getByText('1 finding', {exact: true})).toBeVisible()
    await expect(first.getByText('Areas 1, 2', {exact: true})).toBeVisible()
    await expect(
      first.getByRole('heading', {
        name: 'Text is still under the box',
        exact: true,
      })
    ).toHaveCount(1)
    await expect(
      first.getByText(
        'A black box was drawn over this text, but the text itself was never removed. It stays selectable, searchable, and copy-pasteable.',
        {exact: true}
      )
    ).toHaveCount(1)
    await expect(
      first.getByText('This redaction leaks its length')
    ).toBeVisible()
    await expect(first.getByText('Northwind', {exact: true})).toHaveCount(0)
    const reveal = first.getByRole('button', {
      name: /^Reveal text for area/,
    })
    await expect(reveal).toHaveCount(3)
    // Revealing one passage must not reveal the other passages.
    await reveal.first().click()
    await expect(first.getByText('Northwind', {exact: true})).toHaveCount(1)
    await reveal.first().click()
    await reveal.first().click()
    await expect(first.getByText('Northwind', {exact: true})).toHaveCount(2)
    await expect(
      first.getByText('Project Cardinal', {exact: true})
    ).toBeVisible()
    await first.getByRole('button', {name: 'Show original page'}).click()
    await expect(
      first.getByRole('img', {name: 'Page 1', exact: true})
    ).toHaveCount(1)
    await expect(first.locator('[aria-label^="Finding "]')).toHaveCount(4)
    // The synthetic square annotation covers [72, 180, 164.5, 195] on a
    // 612x792 page. Its interior must remain black even after text is revealed.
    const blackFraction = await first
      .getByRole('img', {name: 'Page 1', exact: true})
      .evaluate(async (element) => {
        const image = element as HTMLImageElement
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = 612
        canvas.height = 792
        const context = canvas.getContext('2d')!
        context.drawImage(image, 0, 0, 612, 792)
        const pixels = context.getImageData(80, 185, 70, 5).data
        let black = 0
        for (let i = 0; i < pixels.length; i += 4) {
          if (pixels[i]! < 40 && pixels[i + 1]! < 40 && pixels[i + 2]! < 40)
            black++
        }
        return black / (pixels.length / 4)
      })
    expect(blackFraction).toBeGreaterThan(0.98)
    await expect(
      second.getByRole('img', {name: 'Page 2', exact: true})
    ).toHaveCount(0)
  })
})
