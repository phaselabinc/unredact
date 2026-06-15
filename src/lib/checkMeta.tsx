import type {IconType} from 'react-icons'
import {FiEye, FiMove, FiMaximize2, FiLayers} from 'react-icons/fi'
import type {CheckId, RedactionGrade} from './analyzer/types'

export interface CheckMeta {
  label: string
  short: string
  blurb: string
  Icon: IconType
}

export const CHECK_META: Record<CheckId, CheckMeta> = {
  'superficial-mark': {
    label: 'Text still under the box',
    short: 'Superficial mark',
    blurb:
      'A black box was painted over the words, but the words were never deleted. They are still selectable, searchable, and copy-pasteable.',
    Icon: FiEye,
  },
  'word-size': {
    label: 'Box width leaks the length',
    short: 'Word-size leak',
    blurb:
      'Even when the text is gone, the width of the box reveals roughly how many characters were hidden, which narrows down what it said.',
    Icon: FiMaximize2,
  },
  'removable-annotation': {
    label: 'Removable redaction mark',
    short: 'Removable mark',
    blurb:
      'The black box is a separate annotation sitting on top of the page. Anyone can drag it off, or delete it, and the content returns.',
    Icon: FiMove,
  },
  'ocr-layer-leak': {
    label: 'Hidden text layer under a scan',
    short: 'OCR layer leak',
    blurb:
      'The page looks like a scanned image, but it carries an invisible searchable text layer underneath the mark.',
    Icon: FiLayers,
  },
}

export interface GradeMeta {
  label: string
  blurb: string
  ring: string // tailwind text color for the ring + number
  bg: string
}

export const GRADE_META: Record<RedactionGrade, GradeMeta> = {
  A: {
    label: 'Looks clean',
    blurb: 'We didn’t find any of the failures we check for. Nice work.',
    ring: 'text-emerald-500',
    bg: 'bg-emerald-500',
  },
  B: {
    label: 'Mostly fine',
    blurb:
      'Nothing recoverable, but a box’s width can still hint at what’s hidden.',
    ring: 'text-lime-500',
    bg: 'bg-lime-500',
  },
  // C is currently unreached (see grade.ts); kept for the grade scale only.
  C: {
    label: 'Minor leak',
    blurb: 'The body looks covered, but a small detail still hints at content.',
    ring: 'text-amber-500',
    bg: 'bg-amber-500',
  },
  D: {
    label: 'Removable redactions',
    blurb:
      'No text recovered, but a redaction mark here lifts right off. Delete it and the content comes back.',
    ring: 'text-orange-500',
    bg: 'bg-orange-500',
  },
  F: {
    label: 'Not actually redacted',
    blurb: 'We pulled text straight out from under the black boxes.',
    ring: 'text-brand-vermillion',
    bg: 'bg-brand-vermillion',
  },
}
