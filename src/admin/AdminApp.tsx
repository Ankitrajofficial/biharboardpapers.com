import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { Skeleton } from '@/components/Loading';
import AdminLayout from './AdminLayout';

const L = (f: () => Promise<{ default: React.ComponentType }>) => { const C = lazy(f); return <Suspense fallback={<Skeleton lines={5} />}><C /></Suspense>; };

/** /admin/* — separate chunk, never linked from the student site, noindex. */
export default function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={L(() => import('./pages/Login'))} />
      <Route element={<AdminLayout />}>
        <Route index element={L(() => import('./pages/Dashboard'))} />
        <Route path="tests" element={L(() => import('./pages/Tests'))} />
        <Route path="tests/:id" element={L(() => import('./pages/TestEdit'))} />
        <Route path="questions" element={L(() => import('./pages/Questions'))} />
        <Route path="updates" element={L(() => import('./pages/Updates'))} />
        <Route path="posters" element={L(() => import('./pages/Posters'))} />
        <Route path="users" element={L(() => import('./pages/Users'))} />
        <Route path="payments" element={L(() => import('./pages/Payments'))} />
        <Route path="content" element={L(() => import('./pages/Content'))} />
        <Route path="team" element={L(() => import('./pages/Team'))} />
        <Route path="audit" element={L(() => import('./pages/Audit'))} />
      </Route>
    </Routes>
  );
}
