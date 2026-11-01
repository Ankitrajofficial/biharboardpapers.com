import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '@/routes';
import { prefsStore, setClass, setMedium, setStream } from '@/lib/prefs';

const mount = (path: string) => render(<RouterProvider router={createMemoryRouter(routes, { initialEntries: [path] })} />);

describe('routing', () => {
  beforeEach(() => { localStorage.clear(); prefsStore.reset(); });

  it('home shows the class chooser for a first-time visitor', async () => {
    mount('/');
    expect(await screen.findByTestId('choose-class-10')).toBeInTheDocument();
    expect(screen.getByText('कक्षा 10 और 12 की पूरी तैयारी')).toBeInTheDocument();
  });

  it('a returning student lands on the subject grid', async () => {
    setClass('class-12'); setMedium('hindi'); setStream('science');
    mount('/');
    expect(await screen.findByTestId('subject-physics')).toBeInTheDocument();
  });

  it('subject, chapter and objective routes resolve in both mediums', async () => {
    const a = mount('/class-12/hindi/bhautiki');
    expect(await screen.findByRole('heading', { level: 1, name: 'भौतिकी' })).toBeInTheDocument();
    a.unmount();
    const b = mount('/class-12/english/physics/electric-charges-and-fields');
    expect(await screen.findByRole('heading', { level: 1, name: /Electric Charges and Fields/ })).toBeInTheDocument();
    b.unmount();
    mount('/class-10/hindi/vigyan/rasayanik-abhikriya-evam-samikaran/objective');
    await waitFor(() => expect(screen.getByTestId('option-A')).toBeInTheDocument());
  });

  it('every static route renders and unknown routes show a friendly 404', async () => {
    for (const p of ['/choose', '/subjects', '/papers', '/mock-test', '/exam-calendar', '/sent-up-practical', '/my-study', '/plans', '/login', '/about', '/privacy', '/disclaimer', '/offline']) {
      const { unmount } = mount(p);
      await waitFor(() => expect(screen.getAllByRole('heading', { level: 1 }).length).toBeGreaterThan(0));
      unmount();
    }
    const a = mount('/does/not/exist');
    expect(await screen.findByTestId('not-found')).toBeInTheDocument();
    a.unmount();
    mount('/class-12/hindi/nope');
    expect(await screen.findByTestId('not-found')).toBeInTheDocument();
  }, 30_000);

  it('the language toggle switches labels and the study medium together', async () => {
    setClass('class-10'); setMedium('hindi');
    mount('/subjects');
    expect(await screen.findByText('सभी विषय')).toBeInTheDocument();
    screen.getByTestId('lang-en').click();
    expect(await screen.findByText('All subjects')).toBeInTheDocument();
    expect(prefsStore.get().medium).toBe('english');
    expect(screen.getByTestId('lang-en').getAttribute('aria-checked')).toBe('true');
  });
});
