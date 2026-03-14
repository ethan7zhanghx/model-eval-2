import type { TestCase } from '@promptfoo/types';

export const V1_DEMO_PROMPT = `Answer the question using only the provided context.

Requirements:
1. Reuse the original wording from the context whenever possible.
2. If the answer is not in the context, reply exactly: I don't know.
3. Keep the answer short and do not add extra explanation.
4. Reply in the same language as the user's question.

Context:
{{context}}

Question:
{{question}}`;

type DemoSample = {
  id: string;
  title: string;
  context: string;
  question: string;
  answer: string;
};

export const V1_DEMO_DATASET_SOURCE = {
  name: 'rajpurkar/squad',
  url: 'https://huggingface.co/datasets/rajpurkar/squad',
};

export const V1_DEMO_SAMPLES: DemoSample[] = [
  {
    id: 'squad-1',
    title: 'Notre Dame / Architect',
    context:
      'Architecturally, the school has a Catholic character. Atop the Main Building is a gold dome with a golden statue of the Virgin Mary. Immediately in front of the Main Building and facing it is a copper statue of Christ with arms upraised with the legend “Venite Ad Me Omnes”. Next to the Main Building is the Basilica of the Sacred Heart. Immediately behind the basilica is the Grotto, a Marian place of prayer and reflection. It is a replica of the grotto at Lourdes, France where the Virgin Mary reputedly appeared to Saint Bernadette Soubirous in 1858. At the end of the main drive is a simple, modern stone statue of Mary.',
    question: 'To whom did the Virgin Mary allegedly appear in 1858 in Lourdes France?',
    answer: 'Saint Bernadette Soubirous',
  },
  {
    id: 'squad-2',
    title: 'Notre Dame / Main Building',
    context:
      'Architecturally, the school has a Catholic character. Atop the Main Building is a gold dome with a golden statue of the Virgin Mary. Immediately in front of the Main Building and facing it is a copper statue of Christ with arms upraised with the legend “Venite Ad Me Omnes”. Next to the Main Building is the Basilica of the Sacred Heart.',
    question: 'What sits on top of the Main Building at Notre Dame?',
    answer: 'a gold dome with a golden statue of the Virgin Mary',
  },
  {
    id: 'squad-3',
    title: 'Notre Dame / Reflection Place',
    context:
      'Immediately behind the basilica is the Grotto, a Marian place of prayer and reflection. It is a replica of the grotto at Lourdes, France where the Virgin Mary reputedly appeared to Saint Bernadette Soubirous in 1858.',
    question: 'What is the Grotto at Notre Dame used for?',
    answer: 'prayer and reflection',
  },
  {
    id: 'squad-4',
    title: 'Notre Dame / School Name',
    context:
      'The University of Notre Dame du Lac, known simply as Notre Dame, is a Catholic research university in Notre Dame, Indiana, United States.',
    question: 'What is the full formal name of Notre Dame?',
    answer: 'The University of Notre Dame du Lac',
  },
  {
    id: 'squad-5',
    title: 'Notre Dame / Founded By',
    context:
      'The school was founded on November 26, 1842, by Edward Sorin. It has since grown to become one of the most recognized Catholic universities in the United States.',
    question: 'Who founded the school?',
    answer: 'Edward Sorin',
  },
  {
    id: 'squad-6',
    title: 'Notre Dame / Founded Date',
    context:
      'The school was founded on November 26, 1842, by Edward Sorin. It has since grown to become one of the most recognized Catholic universities in the United States.',
    question: 'When was the school founded?',
    answer: 'November 26, 1842',
  },
  {
    id: 'squad-7',
    title: 'Notre Dame / State',
    context:
      'The University of Notre Dame du Lac, known simply as Notre Dame, is a Catholic research university in Notre Dame, Indiana, United States.',
    question: 'In which U.S. state is Notre Dame located?',
    answer: 'Indiana',
  },
  {
    id: 'squad-8',
    title: 'Notre Dame / Statue Material',
    context:
      'Immediately in front of the Main Building and facing it is a copper statue of Christ with arms upraised with the legend “Venite Ad Me Omnes”.',
    question: 'What material is the statue of Christ made from?',
    answer: 'copper',
  },
];

export const V1_DEMO_TEST_CASES: TestCase[] = V1_DEMO_SAMPLES.map((sample) => ({
  description: `${sample.title} · ${sample.question}`,
  vars: {
    context: sample.context,
    question: sample.question,
    expected_answer: sample.answer,
  },
  assert: [
    sample.id === 'squad-3'
      ? {
          type: 'contains-any',
          value: ['prayer and reflection', 'Marian place'],
        }
      : sample.id === 'squad-8'
        ? {
            type: 'contains-any',
            value: ['copper', 'Copper'],
          }
        : {
            type: 'contains',
            value: sample.answer,
          },
  ],
}));
