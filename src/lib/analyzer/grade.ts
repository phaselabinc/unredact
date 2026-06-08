import type {AnalysisSummary, CheckId, Finding, RedactionGrade} from './types'

const SEVERITY_RANK: Record<Finding['severity'], number> = {
  leak: 3,
  warning: 2,
  info: 1,
}

const GRADE_BY_TIER: RedactionGrade[] = ['A', 'B', 'C', 'D', 'F']

/**
 * Worst grade tier a single finding justifies (0 = A … 4 = F). We grade by what
 * was actually exposed, not just by severity bucket:
 *  - recovered text (any leak) → F;
 *  - a removable / un-applied mark → D: nothing leaked yet, but the cover lifts
 *    straight off and the content returns;
 *  - leaked metadata → C: real text escapes via the document properties;
 *  - a box-width length hint or a leftover bookmark → only B: speculative,
 *    nothing recoverable.
 */
function gradeTier(f: Finding): number {
  if (f.severity === 'leak') return 4 // F
  if (f.check === 'removable-annotation') return 3 // D
  if (f.check === 'metadata-leak') return 2 // C
  return 1 // B — word-size, outline/bookmark, other non-recoverable hints
}

export function summarize(
  findings: Finding[],
  totalPages: number,
  pagesAnalyzed: number,
  truncated: boolean
): AnalysisSummary {
  let leakCount = 0
  let warningCount = 0
  let infoCount = 0
  let recoveredCharacters = 0
  let metadataLeak = false
  const checks = new Set<CheckId>()
  let worst: Finding | null = null
  let worstTier = 0

  for (const f of findings) {
    checks.add(f.check)
    if (f.severity === 'leak') leakCount++
    else if (f.severity === 'warning') warningCount++
    else infoCount++
    if (f.check === 'metadata-leak') metadataLeak = true
    if (f.recovered) recoveredCharacters += f.recovered.text.length
    if (!worst || SEVERITY_RANK[f.severity] > SEVERITY_RANK[worst.severity]) {
      worst = f
    }
    worstTier = Math.max(worstTier, gradeTier(f))
  }

  const grade: RedactionGrade = GRADE_BY_TIER[worstTier] ?? 'A'

  return {
    totalPages,
    pagesAnalyzed,
    totalFindings: findings.length,
    leakCount,
    warningCount,
    infoCount,
    metadataLeak,
    recoveredCharacters,
    checksTriggered: [...checks],
    worstCheck: worst?.check ?? null,
    grade,
    truncated,
  }
}
