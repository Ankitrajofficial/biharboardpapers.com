import { lazy, Suspense, type ReactNode } from 'react';
import type { RouteObject } from 'react-router';
import { Layout } from './components/Layout';
import { Skeleton } from './components/Loading';
import { HomePage } from './pages/Home';

const L = (load: () => Promise<{ default: React.ComponentType }>): ReactNode => {
  const C = lazy(load);
  return (
    <Suspense fallback={<Skeleton lines={6} />}>
      <C />
    </Suspense>
  );
};

/** Route-level code splitting: only Home ships in the initial bundle. */
export const routes: RouteObject[] = [
  { path: '/admin/*', element: L(() => import('./admin/AdminApp')) },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'choose', element: L(() => import('./pages/Choose')) },
      { path: 'subjects', element: L(() => import('./pages/Subjects')) },
      { path: 'papers', element: L(() => import('./pages/Papers')) },
      { path: 'mock-test', element: L(() => import('./pages/MockList')) },
      { path: 'mock-test/:id', element: L(() => import('./pages/MockTest')) },
      { path: 'mock-test/:id/result', element: L(() => import('./pages/MockResult')) },
      { path: 'syllabus/:classId/:subject', element: L(() => import('./pages/Syllabus')) },
      { path: 'syllabus/:subject', element: L(() => import('./pages/Syllabus')) },
      { path: 'syllabus', element: L(() => import('./pages/SyllabusIndex')) },
      { path: 'exam-calendar', element: L(() => import('./pages/ExamCalendar')) },
      { path: 'sent-up-practical', element: L(() => import('./pages/SentUp')) },
      { path: 'my-study', element: L(() => import('./pages/MyStudy')) },
      { path: 'my-plan', element: L(() => import('./pages/MyPlan')) },
      { path: 'admit-card', element: L(() => import('./pages/AdmitCard')) },
      { path: 'plans', element: L(() => import('./pages/Plans')) },
      { path: 'plans/status', element: L(() => import('./pages/PlanStatus')) },
      { path: 'updates', element: L(() => import('./pages/Updates')) },
      { path: 'tests', element: L(() => import('./pages/Tests')) },
      { path: 'tests/:id', element: L(() => import('./pages/TestTake')) },
      { path: 'tests/:id/result', element: L(() => import('./pages/TestResult')) },
      { path: 'login', element: L(() => import('./pages/Login')) },
      { path: 'about', element: L(() => import('./pages/Static').then((m) => ({ default: m.AboutPage }))) },
      { path: 'privacy', element: L(() => import('./pages/Static').then((m) => ({ default: m.PrivacyPage }))) },
      { path: 'disclaimer', element: L(() => import('./pages/Static').then((m) => ({ default: m.DisclaimerPage }))) },
      { path: 'offline', element: L(() => import('./pages/Static').then((m) => ({ default: m.OfflinePage }))) },
      { path: ':classId/:medium/:subject', element: L(() => import('./pages/Subject')) },
      { path: ':classId/:medium/:subject/objective', element: L(() => import('./pages/Objective')) },
      { path: ':classId/:medium/:subject/important-questions', element: L(() => import('./pages/Important')) },
      { path: ':classId/:medium/:subject/:chapter', element: L(() => import('./pages/Chapter')) },
      { path: ':classId/:medium/:subject/:chapter/objective', element: L(() => import('./pages/Objective')) },
      { path: '*', element: L(() => import('./pages/Static').then((m) => ({ default: m.NotFoundPage }))) },
    ],
  },
];
