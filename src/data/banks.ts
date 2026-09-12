import problemBankJson from '../../data/problemBank.json';
import videoBankJson from '../../data/videoBank.json';
import type { Difficulty, Problem, VideoClip } from '../types';

export const problemBank = problemBankJson as Problem[];
export const videoBank = videoBankJson as VideoClip[];

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

export function pickProblem(
  bank: Problem[],
  usedIds: string[],
  difficulty: Difficulty,
): Problem {
  if (bank.length === 0) {
    throw new Error('problemBank.json is empty');
  }

  const unusedAtDifficulty = bank.filter(
    (p) => p.difficulty === difficulty && !usedIds.includes(p.id),
  );
  if (unusedAtDifficulty.length > 0) return pickRandom(unusedAtDifficulty);

  const atDifficulty = bank.filter((p) => p.difficulty === difficulty);
  if (atDifficulty.length > 0) return pickRandom(atDifficulty);

  const unused = bank.filter((p) => !usedIds.includes(p.id));
  if (unused.length > 0) return pickRandom(unused);

  return pickRandom(bank);
}

export function pickVideo(bank: VideoClip[], usedIds: string[]): VideoClip {
  if (bank.length === 0) {
    throw new Error('videoBank.json is empty');
  }

  const unused = bank.filter((v) => !usedIds.includes(v.id));
  if (unused.length > 0) return pickRandom(unused);
  return pickRandom(bank);
}

export function answersMatch(expected: string, given: string): boolean {
  const normalize = (value: string) =>
    value.trim().toLowerCase().replace(/,/g, '');
  return normalize(expected) === normalize(given);
}
