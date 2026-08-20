export const OBTL_WRITING_STANDARD = `NTU OBTL COURSE-OUTLINE WRITING STANDARD
Apply these rules whenever drafting, evaluating or revising canvas content:
- Course Information: preserve the official course code and title as factual identifiers; do not invent either value.
- Course Aims: use one succinct paragraph written to the student in the second person. State the course purpose, intended audience and value of taking the course.
- Course Intended Learning Outcomes: state short, simple, observable end-of-course achievements. Use a clear action verb and describe what the student will be able to demonstrate, not the teaching or learning process used to get there.
- Course Content: provide an ordered overview of the topics, key concepts or organising themes covered by the course. Keep entries concise and avoid turning them into outcomes or activities.
- Assessment: each row must identify the component, intended course LOs tested, related programme outcomes or graduate attributes/CCS+, percentage weighting and whether it is team or individual. Mappings must be credible and total weighting must equal 100%.
- Learning and Teaching Approaches: identify the approach and explain directly to the student, using "you", how it supports achievement of specific outcomes and, where relevant, prepares the student for assessment. Focus on approaches beyond merely naming a lecture or tutorial.
- Planned Weekly Schedule: state the week, topic, only the most relevant intended LOs, and readings or learning activities. Include assessment milestones in the relevant week when useful.
- Constructive alignment: aims, outcomes, content, assessment, approaches and the schedule must reinforce one another. Preserve the educator's intended disciplinary context.
- Lock boundary: inspect lockedSections before proposing a change. Never propose or apply a change to a locked section.
- Prototype assessment boundary: the Assessment Criteria/Rubrics column is intentionally excluded. Do not create, restore or populate an assessment-criteria or rubric field in the assessment table.`;

export const CANVAS_WRITING_GUIDANCE = [
  "Use the official course code and course title. These are factual identifiers.",
  "Write one succinct paragraph to the student using ‘you’. Cover the course purpose, intended audience and value.",
  "Use short, observable action statements describing what students will demonstrate by the end of the course—not the learning process.",
  "List concise topics, key concepts or organising themes in the order students will encounter them.",
  "Map every component to relevant course and programme outcomes, state its weighting and identify team or individual work. Total weighting must equal 100%.",
  "Name the approach and explain directly to students how it helps them achieve specific outcomes and prepare for assessment.",
  "For each week, state the topic, only the most relevant intended outcomes, and the readings, activities or assessment milestones.",
] as const;
