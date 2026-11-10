/* Optional WebMCP layer • exposes the course to browser agents through document.modelContext.
   Requires the polyfill in vendor/webmcp-polyfill.js, or a browser with native WebMCP.
   Tools mirror the visible UI: they reuse app.js state functions and render immediately. */
const lab = window.crochetLab;
const context = document.modelContext;

const COUNTER_LABEL = { chains: 'foundation-chain', single: 'single-crochet' };
const COUNT_KEY = { 'foundation-chain': 'chains', 'single-crochet': 'single' };

function snapshot() {
  const s = lab.getState();
  const lesson = lab.lessons[s.step];
  const counter = lesson.counter;
  const current = counter === 'chains' ? s.chains : s.rowStitches;
  return {
    currentLesson: {
      number: s.step + 1,
      title: lesson.title,
      short: lesson.short,
      phase: lesson.phase,
      completed: s.done.includes(s.step)
    },
    counter: counter ? {
      kind: COUNTER_LABEL[counter],
      current,
      target: lesson.target,
      targetReached: current >= lesson.target
    } : null,
    stitches: { chains: s.chains, singleCrochets: s.singles, currentRow: s.row, stitchesThisRow: s.rowStitches },
    progress: {
      completedLessons: s.done.length,
      totalLessons: lab.lessons.length,
      percent: Math.round(s.done.length / lab.lessons.length * 100),
      completedLessonNumbers: [...s.done].sort((a, b) => a - b).map(i => i + 1)
    },
    view: lab.getView(),
    paused: s.paused,
    lastSaved: s.lastSaved
  };
}

const ok = extra => ({ ok: true, ...snapshot(), ...extra });
const fail = (error, hint) => ({ ok: false, error, ...(hint ? { hint } : {}) });

function sessionBlocker() {
  const s = lab.getState();
  if (s.paused) return 'The session is paused on this device. Ask the learner to press Resume, then try again.';
  if (lab.getView() !== 'learn') return 'The journal view is open. Call open-crochet-lesson with the lesson number to return to a lesson.';
  return null;
}

const tools = [
  {
    name: 'get-crochet-progress',
    description: 'Read the current crochet lesson, manual stitch counts, completed lessons, and recent journal entries. Use this before acting to see where the learner is. Does not change anything.',
    annotations: { readOnlyHint: true },
    execute() {
      const s = lab.getState();
      return ok({ recentActivity: s.events.slice(0, 10).map(e => ({ title: e.title, detail: e.detail, at: e.at })) });
    }
  },
  {
    name: 'list-crochet-lessons',
    description: 'List the eight beginner crochet lessons in course order with 1-based lesson numbers, phases, counter targets, and completion state. Does not change anything.',
    annotations: { readOnlyHint: true },
    execute() {
      const s = lab.getState();
      return {
        ok: true,
        lessons: lab.lessons.map((lesson, i) => ({
          number: i + 1,
          title: lesson.title,
          short: lesson.short,
          phase: lesson.phase,
          counter: lesson.counter ? COUNTER_LABEL[lesson.counter] : null,
          target: lesson.target,
          videoTimestampSeconds: lesson.time,
          completed: s.done.includes(i),
          current: s.step === i
        }))
      };
    }
  },
  {
    name: 'open-crochet-lesson',
    description: 'Switch the app to one lesson and show the learning view. The side rail, stitch illustration, and instructions update immediately.',
    inputSchema: {
      type: 'object',
      properties: {
        lesson: { type: 'integer', minimum: 1, maximum: 8, description: '1-based lesson number from list-crochet-lessons.' }
      },
      required: ['lesson'],
      additionalProperties: false
    },
    execute({ lesson } = {}) {
      if (!Number.isInteger(lesson)) return fail('lesson must be a whole number from 1 to 8.');
      if (lesson < 1 || lesson > lab.lessons.length) return fail(`lesson must be between 1 and ${lab.lessons.length}.`);
      if (lab.getState().paused) return fail('The session is paused on this device. Ask the learner to press Resume, then try again.');
      lab.setView('learn');
      lab.changeStep(lesson - 1);
      return ok();
    }
  },
  {
    name: 'adjust-stitch-count',
    description: 'Add or remove manually counted stitches for the current lesson. Only the stitch type taught by that lesson can be adjusted: foundation chains in lesson 5, single crochet in lessons 6 and 7. The learner does the actual crochet; this records their count.',
    inputSchema: {
      type: 'object',
      properties: {
        kind: {
          type: 'string',
          enum: ['foundation-chain', 'single-crochet'],
          description: 'Stitch type to change. Must match the current lesson.'
        },
        delta: {
          type: 'integer',
          minimum: -100,
          maximum: 100,
          description: 'Stitches to add (positive) or remove (negative).'
        }
      },
      required: ['kind', 'delta'],
      additionalProperties: false
    },
    execute({ kind, delta } = {}) {
      if (!(kind in COUNT_KEY)) return fail('kind must be foundation-chain or single-crochet.');
      if (!Number.isInteger(delta) || delta === 0) return fail('delta must be a non-zero whole number.');
      if (Math.abs(delta) > 100) return fail('delta must be between -100 and 100.');
      const blocked = sessionBlocker();
      if (blocked) return fail(blocked);
      const s = lab.getState();
      const lesson = lab.lessons[s.step];
      if (!lesson.counter) return fail(`Lesson ${s.step + 1} has no stitch counter. Open lesson 5, 6, or 7 first.`);
      if (lesson.counter !== COUNT_KEY[kind]) {
        return fail(`Lesson ${s.step + 1} counts ${COUNTER_LABEL[lesson.counter]}, not ${kind}.`, `Adjust ${COUNTER_LABEL[lesson.counter]} here, or open the lesson that teaches ${kind}.`);
      }
      const before = kind === 'foundation-chain' ? s.chains : s.rowStitches;
      lab.count(delta);
      const after = kind === 'foundation-chain' ? lab.getState().chains : lab.getState().rowStitches;
      const applied = after - before;
      return ok({
        applied,
        clamped: applied !== delta,
        ...(applied !== delta ? { note: 'The counter cannot go below zero, so part of the change was ignored.' } : {})
      });
    }
  },
  {
    name: 'finish-crochet-row',
    description: 'End the current row of single crochet and start the next row while keeping the total single-crochet count. Requires at least one stitch counted in the current row of a single-crochet lesson.',
    execute() {
      const blocked = sessionBlocker();
      if (blocked) return fail(blocked);
      const s = lab.getState();
      const lesson = lab.lessons[s.step];
      if (lesson.counter !== 'single') return fail(`Lesson ${s.step + 1} does not have rows. Open lesson 6 or 7 first.`);
      if (s.rowStitches === 0) return fail('Count at least one single crochet in this row before finishing it.');
      const finished = { row: s.row, stitches: s.rowStitches };
      lab.nextRow();
      return ok({ finishedRow: finished });
    }
  },
  {
    name: 'complete-crochet-lesson',
    description: 'Mark the current lesson completed and move to the next lesson, mirroring the primary continue button. On the final lesson this opens the journal.',
    execute() {
      const blocked = sessionBlocker();
      if (blocked) return fail(blocked);
      const s = lab.getState();
      const completed = { number: s.step + 1, title: lab.lessons[s.step].title };
      lab.markNext();
      return ok({ completedLesson: completed });
    }
  },
  {
    name: 'open-crochet-journal',
    description: 'Show the journal view with course totals, stitch totals, and the activity log.',
    execute() {
      const s = lab.getState();
      if (s.paused) return fail('The session is paused on this device. Ask the learner to press Resume, then try again.');
      lab.setView('journal');
      return ok({
        totals: { completedLessons: s.done.length, totalLessons: lab.lessons.length, chains: s.chains, singleCrochets: s.singles, currentRow: s.row },
        recentActivity: s.events.slice(0, 20).map(e => ({ title: e.title, detail: e.detail, at: e.at }))
      });
    }
  },
  {
    name: 'self-check-crochet-stitch',
    description: 'Record the learner’s own self-check for the current step and return coaching text. This does not inspect stitches or verify correctness.',
    inputSchema: {
      type: 'object',
      properties: {
        result: {
          type: 'string',
          enum: ['looks-good', 'need-tip'],
          description: 'looks-good when the learner confirms the stitch matches the lesson; need-tip when the learner wants the lesson tip.'
        }
      },
      required: ['result'],
      additionalProperties: false
    },
    execute({ result } = {}) {
      if (result !== 'looks-good' && result !== 'need-tip') return fail('result must be looks-good or need-tip.');
      const blocked = sessionBlocker();
      if (blocked) return fail(blocked);
      const s = lab.getState();
      const feedback = lab.selfCheck(result);
      return ok({
        feedback,
        ...(result === 'need-tip' ? { tip: lab.lessons[s.step].tip } : {})
      });
    }
  }
];

async function registerTools() {
  for (const tool of tools) {
    try {
      await context.registerTool(tool);
    } catch (error) {
      console.error(`WebMCP: could not register ${tool.name}`, error);
    }
  }
}

if (context && typeof context.registerTool === 'function' && lab) {
  if (document.readyState === 'complete') registerTools();
  else window.addEventListener('load', registerTools, { once: true });
}
