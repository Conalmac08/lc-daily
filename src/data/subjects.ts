export type SubjectId = 'technology' | 'dcg' | 'physics' | 'geography' | 'maths' | 'english' | 'irish';

export interface SubjectMeta {
  id: SubjectId;
  name: string;
  level: 'HL' | 'OL';
  target: string;
  assessment: string;
  color: string; // accent hex
  links: { label: string; url: string }[];
}

const SEC_ARCHIVE = { label: 'SEC past papers & marking schemes', url: 'https://www.examinations.ie/exammaterialarchive/' };
const CURRICULUM = { label: 'NCCA specification (curriculumonline.ie)', url: 'https://www.curriculumonline.ie/' };

/** Ordered best → worst current school performance (student's own ranking). */
export const SUBJECTS: SubjectMeta[] = [
  { id: 'technology', name: 'Technology', level: 'HL', target: 'H1', assessment: 'Exam 50% + project (pill dispenser) 50%', color: '#f97316', links: [SEC_ARCHIVE, CURRICULUM] },
  { id: 'dcg', name: 'DCG', level: 'HL', target: 'H1', assessment: 'Exam 60% + Student Assignment (kettle) 40%', color: '#6366f1', links: [SEC_ARCHIVE, CURRICULUM] },
  { id: 'physics', name: 'Physics', level: 'HL', target: 'H1', assessment: 'Exam 80% + Physics in Practice Investigation 20%', color: '#0ea5e9', links: [SEC_ARCHIVE, CURRICULUM] },
  { id: 'geography', name: 'Geography', level: 'HL', target: 'H1', assessment: 'Exam 80% + Geographical Investigation 20%', color: '#ca8a04', links: [SEC_ARCHIVE, CURRICULUM] },
  { id: 'maths', name: 'Maths', level: 'HL', target: 'H2', assessment: '100% exam', color: '#f43f5e', links: [SEC_ARCHIVE, { label: 'Project Maths resources', url: 'https://www.projectmaths.ie/' }] },
  { id: 'english', name: 'English', level: 'HL', target: 'H2', assessment: '100% exam', color: '#a855f7', links: [SEC_ARCHIVE, CURRICULUM] },
  { id: 'irish', name: 'Irish', level: 'OL', target: 'O4–O5', assessment: 'Oral 40% + Paper 1 + Paper 2', color: '#10b981', links: [SEC_ARCHIVE, { label: 'Teanglann.ie dictionary & grammar', url: 'https://www.teanglann.ie/' }, { label: 'Foclóir.ie (English–Irish)', url: 'https://www.focloir.ie/' }] },
];

export const SUBJECT_BY_ID = Object.fromEntries(SUBJECTS.map((s) => [s.id, s])) as Record<SubjectId, SubjectMeta>;

export const DEFAULT_WEIGHTS: Record<SubjectId, number> = {
  maths: 1.3,
  english: 1.2,
  geography: 1.1,
  physics: 1.2,
  dcg: 0.7,
  technology: 0.9,
  irish: 0.3,
};
