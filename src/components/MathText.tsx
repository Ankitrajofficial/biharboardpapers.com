import { useEffect, useState } from 'react';

/** Renders text with inline $...$ formulas via KaTeX (loaded only when a formula is present). */
export function MathText({ text, className }: { text: string; className?: string }) {
  const has = /\$[^$]+\$/.test(text);
  const [state, setState] = useState<{ text: string; html: string } | null>(null);
  useEffect(() => {
    if (!has) return;
    let on = true;
    Promise.all([import('katex'), import('katex/dist/katex.min.css')]).then(([k]) => {
      if (!on) return;
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      setState({ text, html: text.split(/(\$[^$]+\$)/).map((part) => (part.startsWith('$') && part.endsWith('$') ? k.default.renderToString(part.slice(1, -1), { throwOnError: false }) : esc(part))).join('') });
    }).catch(() => {});
    return () => { on = false; };
  }, [text, has]);
  if (!has || state?.text !== text) return <span className={className}>{text}</span>;
  return <span className={className} dangerouslySetInnerHTML={{ __html: state.html }} />;
}
