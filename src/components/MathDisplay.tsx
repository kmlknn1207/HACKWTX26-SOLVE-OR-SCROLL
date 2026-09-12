import { useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MathDisplayProps {
  latex: string;
}

export function MathDisplay({ latex }: MathDisplayProps) {
  const html = useMemo(
    () =>
      katex.renderToString(latex, {
        displayMode: true,
        throwOnError: false,
      }),
    [latex],
  );

  return <div className="math-display" dangerouslySetInnerHTML={{ __html: html }} />;
}
