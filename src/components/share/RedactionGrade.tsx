import type {RedactionGrade as Grade} from '@/lib/analyzer/types'
import {GRADE_META} from '@/lib/checkMeta'
import {cn} from '@/lib/cn'

export function RedactionGradeBadge({
  grade,
  size = 'md',
}: {
  grade: Grade
  size?: 'md' | 'lg'
}) {
  const meta = GRADE_META[grade]
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full border-4 font-display font-bold',
        meta.ring,
        size === 'lg' ? 'h-28 w-28 text-6xl' : 'h-16 w-16 text-3xl'
      )}
      style={{borderColor: 'currentColor'}}
      aria-label={`Redaction grade ${grade}`}
    >
      {grade}
    </div>
  )
}
