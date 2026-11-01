import type { ClassId, Medium } from '@/content/types';
import type { Subject } from '@/data/subjects';
import type { ChapterIndexEntry } from '@/content/types';

export const subjectSlug = (s: Subject, medium: Medium) => (medium === 'hindi' ? s.slug.hi : s.slug.en);
export const subjectPath = (s: Subject, medium: Medium) => `/${s.class}/${medium}/${subjectSlug(s, medium)}`;
export const subjectObjectivePath = (s: Subject, medium: Medium) => `${subjectPath(s, medium)}/objective`;
export const subjectImportantPath = (s: Subject, medium: Medium) => `${subjectPath(s, medium)}/important-questions`;
export const chapterPath = (s: Subject, medium: Medium, c: ChapterIndexEntry) => `${subjectPath(s, medium)}/${c.slug}`;
export const chapterObjectivePath = (s: Subject, medium: Medium, c: ChapterIndexEntry) => `${chapterPath(s, medium, c)}/objective`;
export const syllabusPath = (s: Subject) => `/syllabus/${s.class}/${s.slug.en}`;
export const mockListPath = (s?: Subject) => (s ? `/mock-test?subject=${s.id}` : '/mock-test');
export const papersPath = (classId?: ClassId, subjectId?: string) =>
  `/papers${classId ? `?class=${classId}${subjectId ? `&subject=${subjectId}` : ''}` : ''}`;

export const isClassId = (s: string | undefined): s is ClassId => s === 'class-10' || s === 'class-12';
export const isMedium = (s: string | undefined): s is Medium => s === 'hindi' || s === 'english';
