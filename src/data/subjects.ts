import type { ClassId, Stream } from '@/content/types';

/**
 * Subject catalogue. Codes seeded from BSEB's model-paper pages
 * (biharboardonline.com/modelpaperinter.html and /modelpapermatric.html, 2026 lists).
 * VERIFY AGAINST THE CURRENT BSEB SYLLABUS before launch — marks and objective
 * patterns are the commonly used ones and must be confirmed per subject.
 */
export type SubjectGroup = 'compulsory_language' | 'core' | 'elective' | 'additional';

export interface Subject {
  /** Stable id used in content paths, e.g. "physics" */
  id: string;
  class: ClassId;
  /** BSEB subject code(s) as printed on model papers */
  codes: string[];
  streams: Stream[];
  group: SubjectGroup;
  name: { hi: string; en: string };
  /** URL slug per medium: Hinglish for Hindi, English for English */
  slug: { hi: string; en: string };
  /** lucide-react icon name */
  icon: string;
  marks: { theory: number; practical: number };
  /** Objective pattern: questions given / to attempt */
  objective: { given: number; attempt: number };
  /** Search aliases: Hindi, English and Hinglish */
  aliases: string[];
  /** Official textbook page (NCERT / BSTBPC). Empty when not yet linked. */
  textbookUrl: { hi: string; en: string };
  verified: false;
}

const ALL: Stream[] = ['arts', 'science', 'commerce'];
const s = (p: Omit<Subject, 'verified'>): Subject => ({ ...p, verified: false });

// ---------- Class 10 (Matric) ----------
const c10: Subject[] = [
  s({ id: 'hindi', class: 'class-10', codes: ['101'], streams: ALL, group: 'compulsory_language', name: { hi: 'हिंदी', en: 'Hindi' }, slug: { hi: 'hindi', en: 'hindi' }, icon: 'BookOpen', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['hindi', 'हिन्दी', 'matribhasha', 'mil'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'sanskrit', class: 'class-10', codes: ['105'], streams: ALL, group: 'compulsory_language', name: { hi: 'संस्कृत', en: 'Sanskrit' }, slug: { hi: 'sanskrit', en: 'sanskrit' }, icon: 'ScrollText', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['sanskrit', 'संस्कृत', 'sil'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'english', class: 'class-10', codes: ['113'], streams: ALL, group: 'compulsory_language', name: { hi: 'अंग्रेज़ी', en: 'English' }, slug: { hi: 'angreji', en: 'english' }, icon: 'Languages', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['english', 'angreji', 'अंग्रेजी'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'mathematics', class: 'class-10', codes: ['110'], streams: ALL, group: 'core', name: { hi: 'गणित', en: 'Mathematics' }, slug: { hi: 'ganit', en: 'mathematics' }, icon: 'Calculator', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['maths', 'math', 'ganit', 'गणित'], textbookUrl: { hi: 'https://ncert.nic.in/textbook.php?jhmh1=0-14', en: 'https://ncert.nic.in/textbook.php?jemh1=0-14' } }),
  s({ id: 'science', class: 'class-10', codes: ['112'], streams: ALL, group: 'core', name: { hi: 'विज्ञान', en: 'Science' }, slug: { hi: 'vigyan', en: 'science' }, icon: 'FlaskConical', marks: { theory: 80, practical: 20 }, objective: { given: 80, attempt: 40 }, aliases: ['science', 'vigyan', 'विज्ञान', 'physics', 'chemistry', 'biology'], textbookUrl: { hi: 'https://ncert.nic.in/textbook.php?jhsc1=0-13', en: 'https://ncert.nic.in/textbook.php?jesc1=0-13' } }),
  s({ id: 'social-science', class: 'class-10', codes: ['111'], streams: ALL, group: 'core', name: { hi: 'सामाजिक विज्ञान', en: 'Social Science' }, slug: { hi: 'samajik-vigyan', en: 'social-science' }, icon: 'Globe', marks: { theory: 80, practical: 20 }, objective: { given: 80, attempt: 40 }, aliases: ['social science', 'sst', 'samajik vigyan', 'सामाजिक', 'history', 'geography', 'civics', 'economics'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'advanced-maths', class: 'class-10', codes: ['114'], streams: ALL, group: 'additional', name: { hi: 'उच्च गणित (ऐच्छिक)', en: 'Advanced Mathematics (Optional)' }, slug: { hi: 'uchch-ganit', en: 'advanced-mathematics' }, icon: 'Sigma', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['advanced maths', 'uchch ganit', 'उच्च गणित', 'optional maths'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'urdu', class: 'class-10', codes: ['103'], streams: ALL, group: 'compulsory_language', name: { hi: 'उर्दू', en: 'Urdu' }, slug: { hi: 'urdu', en: 'urdu' }, icon: 'BookOpen', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['urdu', 'उर्दू'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'maithili', class: 'class-10', codes: ['104', '124'], streams: ALL, group: 'compulsory_language', name: { hi: 'मैथिली', en: 'Maithili' }, slug: { hi: 'maithili', en: 'maithili' }, icon: 'BookOpen', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['maithili', 'मैथिली'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'bangla', class: 'class-10', codes: ['102'], streams: ALL, group: 'compulsory_language', name: { hi: 'बांग्ला', en: 'Bangla' }, slug: { hi: 'bangla', en: 'bangla' }, icon: 'BookOpen', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['bangla', 'bengali', 'बांग्ला'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'bhojpuri', class: 'class-10', codes: ['109'], streams: ALL, group: 'compulsory_language', name: { hi: 'भोजपुरी', en: 'Bhojpuri' }, slug: { hi: 'bhojpuri', en: 'bhojpuri' }, icon: 'BookOpen', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['bhojpuri', 'भोजपुरी'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'arabic', class: 'class-10', codes: ['107', '123'], streams: ALL, group: 'compulsory_language', name: { hi: 'अरबी', en: 'Arabic' }, slug: { hi: 'arabi', en: 'arabic' }, icon: 'BookOpen', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['arabic', 'arabi', 'अरबी'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'persian', class: 'class-10', codes: ['108', '121'], streams: ALL, group: 'compulsory_language', name: { hi: 'फ़ारसी', en: 'Persian' }, slug: { hi: 'farsi', en: 'persian' }, icon: 'BookOpen', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['persian', 'farsi', 'फारसी'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'sil-hindi', class: 'class-10', codes: ['106'], streams: ALL, group: 'compulsory_language', name: { hi: 'हिंदी (द्वितीय भाषा)', en: 'Hindi (SIL)' }, slug: { hi: 'hindi-dwitiya', en: 'hindi-sil' }, icon: 'BookOpen', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['sil hindi', 'hindi second language', 'द्वितीय भाषा'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'commerce', class: 'class-10', codes: ['115'], streams: ALL, group: 'additional', name: { hi: 'वाणिज्य (ऐच्छिक)', en: 'Commerce (Optional)' }, slug: { hi: 'vanijya', en: 'commerce' }, icon: 'Briefcase', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['commerce', 'vanijya', 'वाणिज्य'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'economics', class: 'class-10', codes: ['116'], streams: ALL, group: 'additional', name: { hi: 'अर्थशास्त्र (ऐच्छिक)', en: 'Economics (Optional)' }, slug: { hi: 'arthashastra', en: 'economics' }, icon: 'TrendingUp', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['economics', 'arthashastra', 'अर्थशास्त्र'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'fine-arts', class: 'class-10', codes: ['117'], streams: ALL, group: 'additional', name: { hi: 'ललित कला', en: 'Fine Arts' }, slug: { hi: 'lalit-kala', en: 'fine-arts' }, icon: 'Palette', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['fine arts', 'lalit kala', 'ललित कला', 'drawing'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'home-science', class: 'class-10', codes: ['118'], streams: ALL, group: 'additional', name: { hi: 'गृह विज्ञान', en: 'Home Science' }, slug: { hi: 'grih-vigyan', en: 'home-science' }, icon: 'Home', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['home science', 'grih vigyan', 'गृह विज्ञान'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'dance', class: 'class-10', codes: ['119'], streams: ALL, group: 'additional', name: { hi: 'नृत्य', en: 'Dance' }, slug: { hi: 'nritya', en: 'dance' }, icon: 'Music', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['dance', 'nritya', 'नृत्य'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'music', class: 'class-10', codes: ['120'], streams: ALL, group: 'additional', name: { hi: 'संगीत', en: 'Music' }, slug: { hi: 'sangeet', en: 'music' }, icon: 'Music', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['music', 'sangeet', 'संगीत'], textbookUrl: { hi: '', en: '' } }),
];

// ---------- Class 12 (Intermediate) ----------
const lang12 = (id: string, codes: string[], hi: string, en: string, slugHi: string, aliases: string[]): Subject =>
  s({ id, class: 'class-12', codes, streams: ALL, group: 'compulsory_language', name: { hi, en }, slug: { hi: slugHi, en: id }, icon: 'BookOpen', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases, textbookUrl: { hi: '', en: '' } });

const c12: Subject[] = [
  // Languages
  lang12('hindi', ['106', '206', '306'], 'हिंदी', 'Hindi', 'hindi', ['hindi', 'हिन्दी']),
  { ...lang12('english', ['105', '124', '205', '223'], 'अंग्रेज़ी', 'English', 'angreji', ['english', 'angreji', 'अंग्रेजी']), icon: 'Languages' },
  lang12('urdu', ['107', '207', '307', '503'], 'उर्दू', 'Urdu', 'urdu', ['urdu', 'उर्दू']),
  lang12('maithili', ['108', '208', '308', '504'], 'मैथिली', 'Maithili', 'maithili', ['maithili', 'मैथिली']),
  { ...lang12('sanskrit', ['109', '209', '309', '505'], 'संस्कृत', 'Sanskrit', 'sanskrit', ['sanskrit', 'संस्कृत']), icon: 'ScrollText' },
  lang12('prakrit', ['110', '210', '310', '506'], 'प्राकृत', 'Prakrit', 'prakrit', ['prakrit', 'प्राकृत']),
  lang12('magahi', ['111', '211', '311'], 'मगही', 'Magahi', 'magahi', ['magahi', 'मगही']),
  lang12('bhojpuri', ['112', '212', '312', '508'], 'भोजपुरी', 'Bhojpuri', 'bhojpuri', ['bhojpuri', 'भोजपुरी']),
  lang12('arabic', ['113', '213', '313', '509'], 'अरबी', 'Arabic', 'arabi', ['arabic', 'arabi', 'अरबी']),
  lang12('persian', ['114', '214', '314', '510'], 'फ़ारसी', 'Persian', 'farsi', ['persian', 'farsi', 'फारसी']),
  lang12('pali', ['115', '215', '315', '511'], 'पालि', 'Pali', 'pali', ['pali', 'पाली']),
  lang12('bangla', ['116', '216', '316', '512'], 'बांग्ला', 'Bangla', 'bangla', ['bangla', 'bengali', 'बांग्ला']),

  // Science
  s({ id: 'physics', class: 'class-12', codes: ['117'], streams: ['science'], group: 'core', name: { hi: 'भौतिकी', en: 'Physics' }, slug: { hi: 'bhautiki', en: 'physics' }, icon: 'Atom', marks: { theory: 70, practical: 30 }, objective: { given: 70, attempt: 35 }, aliases: ['physics', 'bhautiki', 'bhotiki', 'भौतिक विज्ञान', 'भौतिकी'], textbookUrl: { hi: 'https://ncert.nic.in/textbook.php?lhph1=0-8', en: 'https://ncert.nic.in/textbook.php?leph1=0-8' } }),
  s({ id: 'chemistry', class: 'class-12', codes: ['118'], streams: ['science'], group: 'core', name: { hi: 'रसायन विज्ञान', en: 'Chemistry' }, slug: { hi: 'rasayan-vigyan', en: 'chemistry' }, icon: 'FlaskConical', marks: { theory: 70, practical: 30 }, objective: { given: 70, attempt: 35 }, aliases: ['chemistry', 'rasayan', 'rasayan vigyan', 'रसायन'], textbookUrl: { hi: 'https://ncert.nic.in/textbook.php?lhch1=0-9', en: 'https://ncert.nic.in/textbook.php?lech1=0-9' } }),
  s({ id: 'biology', class: 'class-12', codes: ['119'], streams: ['science'], group: 'core', name: { hi: 'जीव विज्ञान', en: 'Biology' }, slug: { hi: 'jeev-vigyan', en: 'biology' }, icon: 'Dna', marks: { theory: 70, practical: 30 }, objective: { given: 70, attempt: 35 }, aliases: ['biology', 'jeev vigyan', 'bio', 'जीव विज्ञान'], textbookUrl: { hi: 'https://ncert.nic.in/textbook.php?lhbo1=0-13', en: 'https://ncert.nic.in/textbook.php?lebo1=0-13' } }),
  s({ id: 'mathematics', class: 'class-12', codes: ['121', '327'], streams: ['science', 'arts'], group: 'core', name: { hi: 'गणित', en: 'Mathematics' }, slug: { hi: 'ganit', en: 'mathematics' }, icon: 'Calculator', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['maths', 'math', 'ganit', 'गणित'], textbookUrl: { hi: 'https://ncert.nic.in/textbook.php?lhmh1=0-6', en: 'https://ncert.nic.in/textbook.php?lemh1=0-6' } }),
  s({ id: 'agriculture', class: 'class-12', codes: ['120'], streams: ['science'], group: 'elective', name: { hi: 'कृषि', en: 'Agriculture' }, slug: { hi: 'krishi', en: 'agriculture' }, icon: 'Sprout', marks: { theory: 70, practical: 30 }, objective: { given: 70, attempt: 35 }, aliases: ['agriculture', 'krishi', 'कृषि'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'computer-science', class: 'class-12', codes: ['122', '221', '328'], streams: ALL, group: 'elective', name: { hi: 'कंप्यूटर विज्ञान', en: 'Computer Science' }, slug: { hi: 'computer-vigyan', en: 'computer-science' }, icon: 'Monitor', marks: { theory: 70, practical: 30 }, objective: { given: 70, attempt: 35 }, aliases: ['computer', 'computer science', 'cs', 'कंप्यूटर'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'multimedia-web-technology', class: 'class-12', codes: ['123'], streams: ['science'], group: 'elective', name: { hi: 'मल्टीमीडिया एवं वेब टेक्नोलॉजी', en: 'Multimedia & Web Technology' }, slug: { hi: 'multimedia-web', en: 'multimedia-web-technology' }, icon: 'Monitor', marks: { theory: 70, practical: 30 }, objective: { given: 70, attempt: 35 }, aliases: ['multimedia', 'web technology', 'mwt', 'मल्टीमीडिया'], textbookUrl: { hi: '', en: '' } }),

  // Commerce
  s({ id: 'accountancy', class: 'class-12', codes: ['220'], streams: ['commerce'], group: 'core', name: { hi: 'लेखाशास्त्र', en: 'Accountancy' }, slug: { hi: 'lekhashastra', en: 'accountancy' }, icon: 'BookMarked', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['accountancy', 'accounts', 'lekhashastra', 'लेखा'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'business-studies', class: 'class-12', codes: ['217'], streams: ['commerce'], group: 'core', name: { hi: 'व्यवसाय अध्ययन', en: 'Business Studies' }, slug: { hi: 'vyavsay-adhyayan', en: 'business-studies' }, icon: 'Briefcase', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['business studies', 'vyavsay', 'bst', 'व्यवसाय'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'economics', class: 'class-12', codes: ['219', '326'], streams: ['commerce', 'arts'], group: 'core', name: { hi: 'अर्थशास्त्र', en: 'Economics' }, slug: { hi: 'arthashastra', en: 'economics' }, icon: 'TrendingUp', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['economics', 'arthashastra', 'eco', 'अर्थशास्त्र'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'entrepreneurship', class: 'class-12', codes: ['218'], streams: ['commerce'], group: 'elective', name: { hi: 'उद्यमिता', en: 'Entrepreneurship' }, slug: { hi: 'udyamita', en: 'entrepreneurship' }, icon: 'Lightbulb', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['entrepreneurship', 'udyamita', 'उद्यमिता'], textbookUrl: { hi: '', en: '' } }),

  // Arts (largest stream)
  s({ id: 'history', class: 'class-12', codes: ['321'], streams: ['arts'], group: 'core', name: { hi: 'इतिहास', en: 'History' }, slug: { hi: 'itihas', en: 'history' }, icon: 'Landmark', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['history', 'itihas', 'इतिहास'], textbookUrl: { hi: 'https://ncert.nic.in/textbook.php?lhhs1=0-4', en: 'https://ncert.nic.in/textbook.php?lehs1=0-4' } }),
  s({ id: 'political-science', class: 'class-12', codes: ['322'], streams: ['arts'], group: 'core', name: { hi: 'राजनीति विज्ञान', en: 'Political Science' }, slug: { hi: 'rajniti-vigyan', en: 'political-science' }, icon: 'Scale', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['political science', 'rajniti', 'pol science', 'राजनीति'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'geography', class: 'class-12', codes: ['323'], streams: ['arts'], group: 'core', name: { hi: 'भूगोल', en: 'Geography' }, slug: { hi: 'bhugol', en: 'geography' }, icon: 'Globe', marks: { theory: 70, practical: 30 }, objective: { given: 70, attempt: 35 }, aliases: ['geography', 'bhugol', 'भूगोल'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'psychology', class: 'class-12', codes: ['324'], streams: ['arts'], group: 'core', name: { hi: 'मनोविज्ञान', en: 'Psychology' }, slug: { hi: 'manovigyan', en: 'psychology' }, icon: 'Brain', marks: { theory: 70, practical: 30 }, objective: { given: 70, attempt: 35 }, aliases: ['psychology', 'manovigyan', 'मनोविज्ञान'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'sociology', class: 'class-12', codes: ['325'], streams: ['arts'], group: 'core', name: { hi: 'समाजशास्त्र', en: 'Sociology' }, slug: { hi: 'samajshastra', en: 'sociology' }, icon: 'Users', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['sociology', 'samajshastra', 'समाजशास्त्र'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'philosophy', class: 'class-12', codes: ['320'], streams: ['arts'], group: 'core', name: { hi: 'दर्शनशास्त्र', en: 'Philosophy' }, slug: { hi: 'darshanshastra', en: 'philosophy' }, icon: 'Lightbulb', marks: { theory: 100, practical: 0 }, objective: { given: 100, attempt: 50 }, aliases: ['philosophy', 'darshan', 'दर्शन'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'home-science', class: 'class-12', codes: ['319'], streams: ['arts'], group: 'elective', name: { hi: 'गृह विज्ञान', en: 'Home Science' }, slug: { hi: 'grih-vigyan', en: 'home-science' }, icon: 'Home', marks: { theory: 70, practical: 30 }, objective: { given: 70, attempt: 35 }, aliases: ['home science', 'grih vigyan', 'गृह विज्ञान'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'music', class: 'class-12', codes: ['318'], streams: ['arts'], group: 'elective', name: { hi: 'संगीत', en: 'Music' }, slug: { hi: 'sangeet', en: 'music' }, icon: 'Music', marks: { theory: 30, practical: 70 }, objective: { given: 30, attempt: 15 }, aliases: ['music', 'sangeet', 'संगीत'], textbookUrl: { hi: '', en: '' } }),
  s({ id: 'yoga-physical-education', class: 'class-12', codes: ['317'], streams: ['arts'], group: 'elective', name: { hi: 'योग एवं शारीरिक शिक्षा', en: 'Yoga & Physical Education' }, slug: { hi: 'yog-sharirik-shiksha', en: 'yoga-physical-education' }, icon: 'HeartPulse', marks: { theory: 70, practical: 30 }, objective: { given: 70, attempt: 35 }, aliases: ['yoga', 'physical education', 'yog', 'योग'], textbookUrl: { hi: '', en: '' } }),
];

export const subjects: Subject[] = [...c10, ...c12];

export const subjectsFor = (classId: ClassId, stream?: Stream | null): Subject[] =>
  subjects.filter((x) => x.class === classId && (classId === 'class-10' || !stream || x.streams.includes(stream)));

/** Core (non-language) subjects first, then languages, then electives — keeps the home grid short. */
export const orderedSubjectsFor = (classId: ClassId, stream?: Stream | null): Subject[] => {
  const order: Record<SubjectGroup, number> = { core: 0, compulsory_language: 1, elective: 2, additional: 3 };
  return subjectsFor(classId, stream).sort((a, b) => order[a.group] - order[b.group]);
};

export const getSubject = (classId: ClassId, id: string) => subjects.find((x) => x.class === classId && x.id === id);

export const getSubjectBySlug = (classId: ClassId, slug: string) =>
  subjects.find((x) => x.class === classId && (x.slug.hi === slug || x.slug.en === slug || x.id === slug));

/** Subject colour family per the design system (Science mint, Maths blue, Languages pink, Arts violet, Commerce indigo, other cyan). */
export type Tone = 'mint' | 'blue' | 'pink' | 'violet' | 'indigo' | 'cyan';
export function subjectTone(s: Subject): Tone {
  if (['science', 'physics', 'chemistry', 'biology', 'agriculture'].includes(s.id)) return 'mint';
  if (['mathematics', 'advanced-maths'].includes(s.id)) return 'blue';
  if (s.group === 'compulsory_language') return 'pink';
  if (['accountancy', 'business-studies', 'economics', 'entrepreneurship', 'commerce'].includes(s.id)) return 'indigo';
  if (['computer-science', 'multimedia-web-technology', 'yoga-physical-education'].includes(s.id)) return 'cyan';
  return 'violet';
}
