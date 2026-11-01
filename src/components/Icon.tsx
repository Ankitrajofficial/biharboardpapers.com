import {
  Atom, BookMarked, BookOpen, Brain, Briefcase, Calculator, Dna, FlaskConical, Globe, HeartPulse, Home, Landmark,
  Languages, Lightbulb, Monitor, Music, Palette, Scale, ScrollText, Sigma, Sprout, TrendingUp, Users, type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';

const map: Record<string, ComponentType<LucideProps>> = {
  Atom, BookMarked, BookOpen, Brain, Briefcase, Calculator, Dna, FlaskConical, Globe, HeartPulse, Home, Landmark,
  Languages, Lightbulb, Monitor, Music, Palette, Scale, ScrollText, Sigma, Sprout, TrendingUp, Users,
};

/** Subject icon by name from the catalogue. Always paired with text by the caller. */
export function SubjectIcon({ name, ...rest }: { name: string } & LucideProps) {
  const C = map[name] ?? BookOpen;
  return <C aria-hidden="true" strokeWidth={1.75} {...rest} />;
}
