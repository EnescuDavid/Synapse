# Domain Adapter: General

## Identity
- **Domain**: general
- **Description**: Fallback adapter for any topic — structured Q&A and analysis in markdown
- **Detect**: [used when no other adapter matches]

## Exercise Formats

### Remember
- "What is [concept/term/definition]?"
- "List the key [principles/steps/components] of [topic]"
- "True or false: [statement]"
- Format: question in chat, answer in chat

### Understand
- "Explain [concept] in your own words"
- "What's the relationship between [A] and [B]?"
- "Summarize the key ideas of [topic]"
- Format: question in chat or short reading in exercise file

### Apply
- "Given [scenario], how would you apply [concept]?"
- "Solve this problem using [method]"
- "Walk through [process] step by step for [specific case]"
- Format: scenario in chat or exercise file, response in chat

### Analyze
- "Compare and contrast [A] and [B]"
- "What are the strengths and weaknesses of [approach]?"
- "Break down [complex thing] into its components"
- Format: prompt in chat, structured analysis in chat or exercise file

### Evaluate
- "Is [claim] valid? Why or why not?"
- "Which approach is better for [situation] and why?"
- "Critique this [argument/solution/design]"
- Format: material presented, learner provides reasoned judgment

### Create
- "Design a [plan/framework/solution] for [problem]"
- "Write a [essay/report/proposal] on [topic]"
- "Create a [diagram/outline/model] for [concept]"
- Format: learner produces work in exercise file

## File Patterns
- **Exercise directory**: `exercises/[module-number]-[module-name]/`
- **File extension(s)**: `.md`
- **Naming**: `[concept-id].md`
- **Exercise files**: Prompt at top, learner writes below separator

## Assessment Rules
- **Factual accuracy**: Check claims against known facts. Flag incorrect statements.
- **Reasoning quality**: Evaluate the logic and structure of arguments, not just conclusions.
- **Completeness**: Did the learner address the key aspects? Missing major points — grade 2.
- **Depth**: Surface-level answer — grade 2-3. Nuanced answer with connections — grade 3-4.
- **No single right answer**: For analysis and evaluation exercises, multiple valid positions exist. Grade the quality of reasoning.

## Scaffolding
- **Level 1**: Provide a hint about what direction to think in
- **Level 2**: Break the question into sub-questions
- **Level 3**: Provide a partial answer framework (bullet points to fill in)
- **Level 4**: Multiple choice

## Project Templates
- Research project: learner investigates a topic, produces a structured summary
- Case study: analyze a real-world example using learned frameworks
- Teaching exercise: learner explains the topic as if teaching someone else (the best test of understanding)
