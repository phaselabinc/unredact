import type {AnalysisSummary, CheckId, Finding, RedactionGrade} from './types'

const SEVERITY_RANK: Record<Finding['severity'], number> = {
  leak: 3,
  warning: 2,
  info: 1,
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
  }

  let grade: RedactionGrade
  if (leakCount > 0) grade = 'F'
  else if (warningCount > 0) grade = 'D'
  else if (metadataLeak) grade = 'C'
  else if (infoCount > 0) grade = 'B'
  else grade = 'A'

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
