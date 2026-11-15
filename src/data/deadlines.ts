import type { SubjectId } from './subjects';

export type DeadlineKind = 'coursework' | 'oral' | 'exam';

export interface Deadline {
  id: string;
  name: string;
  subject: SubjectId | null; // null = all subjects
  kind: DeadlineKind;
  date: string; // YYYY-MM-DD (start date for ranges)
  endDate?: string;
  weightNote?: string;
  tasks: string[]; // coursework milestone tasks (editable)
}

export const DEFAULT_DEADLINES: Deadline[] = [
  {
    id: 'physics-investigation', name: 'Physics in Practice Investigation', subject: 'physics', kind: 'coursework', date: '2026-12-11', weightNote: '20%',
    tasks: [
      'Finalise research question & hypothesis',
      'Write the method & risk assessment',
      'Collect & tabulate results',
      'Write up uncertainty analysis',
      'Draw graphs & analyse results',
      'Write conclusion & evaluation',
      'Proofread & check against the marking criteria',
    ],
  },
  {
    id: 'dcg-assignment', name: 'DCG Student Assignment (kettle)', subject: 'dcg', kind: 'coursework', date: '2027-01-15', weightNote: '40%',
    tasks: [
      'Refine SolidWorks model of the kettle',
      'Freehand design sketches & annotations',
      'Produce working drawings from the model',
      'Render & presentation layouts',
      'Analysis section: ergonomics & form',
      'Check every section against the assignment brief',
    ],
  },
  {
    id: 'tech-project', name: 'Technology project (pill dispenser)', subject: 'technology', kind: 'coursework', date: '2027-03-19', weightNote: '50%',
    tasks: [
      'Update research & design brief analysis',
      'Develop & evaluate design ideas',
      'Electronics: build & test circuit',
      'Program & test the microcontroller code',
      'Manufacture & assemble the dispenser',
      'Testing & evaluation write-up',
      'Portfolio: tidy layout & project management section',
    ],
  },
  {
    id: 'irish-oral', name: 'Irish oral', subject: 'irish', kind: 'oral', date: '2027-03-20', endDate: '2027-03-25', weightNote: '40%',
    tasks: [],
  },
  {
    id: 'geo-investigation', name: 'Geographical Investigation', subject: 'geography', kind: 'coursework', date: '2027-04-30', weightNote: '20%',
    tasks: [
      'Refine aims & hypothesis',
      'Plan fieldwork methods',
      'Process & present results (graphs, maps)',
      'Write analysis & conclusions',
      'Evaluation & final check against the guidelines',
    ],
  },
  { id: 'written-exams', name: 'Leaving Cert written exams begin', subject: null, kind: 'exam', date: '2027-06-02', tasks: [] },
];
