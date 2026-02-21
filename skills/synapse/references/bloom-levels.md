# Bloom's Taxonomy Reference

How Bloom's levels map to exercise types in Synapse. The domain adapter determines the **format**, Bloom's determines the **cognitive demand**.

## Bloom's Levels (0-6)

| Level | Name | Cognitive Demand | Verb | Exercise Character |
|-------|------|-----------------|------|-------------------|
| 0 | Not Started | — | — | Concept not yet introduced |
| 1 | Remember | Recall facts | Define, list, recall | Recognition and retrieval |
| 2 | Understand | Explain ideas | Explain, predict, summarize | Comprehension and interpretation |
| 3 | Apply | Use in new situations | Solve, implement, demonstrate | Execution and problem-solving |
| 4 | Analyze | Break down, compare | Debug, compare, differentiate | Decomposition and examination |
| 5 | Evaluate | Judge, critique | Critique, evaluate, justify | Assessment and reasoning |
| 6 | Create | Build, design | Design, build, compose | Synthesis and invention |

## Exercise Type by Bloom's Level

### Remember (Level 1)
- Recall definitions and facts
- Recognition from examples
- Multiple choice
- "What is...?" / "What does...?"
- Quick, low-effort exercises

### Understand (Level 2)
- Explain concepts in own words
- Predict outcomes
- Summarize and paraphrase
- "Why does...?" / "What happens if...?"
- Moderate effort, tests comprehension

### Apply (Level 3)
- Solve problems using learned concepts
- Implement solutions
- Follow procedures in new contexts
- "Write/build/solve..."
- Hands-on, moderate-to-high effort

### Analyze (Level 4)
- Break complex things into parts
- Compare and contrast
- Find bugs, errors, or patterns
- "What's wrong with...?" / "How do X and Y differ?"
- Requires deeper thinking

### Evaluate (Level 5)
- Judge quality, effectiveness, correctness
- Critique approaches
- Choose between alternatives with reasoning
- "Which is better and why?" / "Is this valid?"
- Requires judgment and justification

### Create (Level 6)
- Design new solutions
- Build complete artifacts
- Combine concepts in novel ways
- "Design/build/create..."
- Highest cognitive demand, open-ended

## Bloom's Level Advancement

A concept's Bloom's level advances when:
1. The learner demonstrates competence at the current level (grade 3+ on 2-3 exercises)
2. Prerequisites at the current level are satisfied
3. The session planner decides to advance (not mid-exercise)

Advancement is gradual: Remember → Understand → Apply → Analyze → Evaluate → Create

Not all concepts need to reach Create. The target level depends on the curriculum's goals:
- Foundational concepts: Apply is often sufficient
- Core concepts: Analyze or Evaluate
- Capstone concepts: Create

## Integration with Domain Adapters

The adapter defines **what** each level looks like in practice:

| Level | Coding | General |
|-------|--------|---------|
| Remember | "What does `len()` do?" | "What is [term]?" |
| Understand | "Predict the output" | "Explain in your own words" |
| Apply | "Write a function that..." | "Apply [concept] to [scenario]" |
| Analyze | "Find the bug" | "Compare and contrast" |
| Evaluate | "Code review" | "Is this valid? Why?" |
| Create | "Design a class/system" | "Design a framework/solution" |

## Integration with FSRS

- Bloom's level determines **what kind** of exercise to present
- FSRS determines **when** and **how urgently** to present it
- They are independent: a concept at Apply level (Bloom's 3) might be due for review (FSRS), so the exercise is an Apply-level exercise about that concept
