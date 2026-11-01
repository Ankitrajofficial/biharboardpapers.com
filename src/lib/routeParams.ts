import { useParams } from 'react-router';
import { getSubjectBySlug, type Subject } from '@/data/subjects';
import { isClassId, isMedium } from './paths';
import type { ClassId, Medium } from '@/content/types';

export interface SubjectRoute {
  classId: ClassId;
  medium: Medium;
  subject: Subject;
  chapterSlug?: string;
}

/** Parses /:classId/:medium/:subject(/:chapter). Returns null for unknown values (→ 404). */
export function useSubjectRoute(): SubjectRoute | null {
  const { classId, medium, subject, chapter } = useParams();
  if (!isClassId(classId) || !isMedium(medium) || !subject) return null;
  const s = getSubjectBySlug(classId, subject);
  if (!s) return null;
  return { classId, medium, subject: s, chapterSlug: chapter };
}
