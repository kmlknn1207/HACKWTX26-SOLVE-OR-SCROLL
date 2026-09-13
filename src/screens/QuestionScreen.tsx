import type { VideoQuestion } from '../types';

interface QuestionScreenProps {
  question: VideoQuestion | null;
  onSubmit: (answer: string) => void;
}

export function QuestionScreen({ question, onSubmit }: QuestionScreenProps) {
  if (!question) {
    return (
      <main className="screen">
        <p>Loading question…</p>
      </main>
    );
  }

  return (
    <main className="screen">
      <h1>Video question</h1>
      {question.reelNumber && question.reelCount && (
        <p className="meta">From reel {question.reelNumber} of {question.reelCount}</p>
      )}
      <p className="prompt">{question.question}</p>
      <ul className="options">
        {question.options.map((option) => (
          <li key={option}>
            <button type="button" onClick={() => onSubmit(option)}>
              {option}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
