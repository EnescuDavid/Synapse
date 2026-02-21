# Domain Adapter: Coding

## Identity
- **Domain**: coding
- **Description**: Programming in any language — exercises are real code files with tests
- **Detect**: python, javascript, typescript, rust, go, java, c, c++, programming, coding, web development, backend, frontend, software, scripting, automation

## Exercise Formats

### Remember
- "What does `[function/keyword]` do?"
- "What will this code output?" (with a short snippet)
- Multiple choice on syntax or behavior
- Format: question in chat, answer in chat

### Understand
- "Explain what this code does, line by line"
- "Predict the output of this program" (longer snippet)
- "Why does this produce [output] instead of [expected]?"
- Format: code snippet in chat or read from exercise file, answer in chat

### Apply
- "Write a function that [specification]"
- "Implement [data structure / algorithm]"
- "Fix this code so it [requirement]"
- Format: learner writes code in exercise file, Claude runs tests to verify

### Analyze
- "This code has a bug. Find and fix it."
- "Compare these two implementations — which is better and why?"
- "What's the time complexity of this function?"
- Format: buggy code in exercise file, learner debugs and explains

### Evaluate
- "Code review: what would you change about this code?"
- "Which design pattern fits this problem? Why?"
- "This solution works but has issues. Identify them."
- Format: code in exercise file, learner writes analysis in comments or chat

### Create
- "Design and implement a [module/class/system] that [requirements]"
- "Build a CLI tool that [specification]"
- "Refactor this code to [goal]"
- Format: learner builds in exercise file(s), Claude reviews the design + implementation

## File Patterns
- **Exercise directory**: `exercises/[module-number]-[module-name]/`
- **File extension(s)**: Matches the language being learned (`.py`, `.js`, `.ts`, `.rs`, etc.)
- **Naming**: `[concept-id].[ext]` (e.g., `list-comprehensions.py`)
- **Test files**: `[concept-id].test.[ext]` or `test_[concept-id].[ext]` (follows language convention)
- **Starter code**: Exercise files can include comments with instructions and starter scaffolding

## Assessment Rules
- **Primary**: Run tests. If tests pass, it's correct.
- **Secondary**: Claude reviews code quality (readability, idioms, edge cases) — this doesn't affect FSRS grade, but gets mentioned in feedback.
- **Partial credit**: Tests partially pass — grade 2 (Hard). Right approach, wrong details.
- **Style**: Don't grade style on Remember/Understand exercises. Start grading style at Analyze+.
- **Language-specific**: Follow the language's conventions (PEP 8 for Python, standard linting for JS, etc.)

## Scaffolding
- **Level 1**: Add comments with hints in the exercise file ("// Hint: think about what happens when the list is empty")
- **Level 2**: Provide function signature and docstring, learner fills in the body
- **Level 3**: Provide partial implementation with blanks (`// YOUR CODE HERE`)
- **Level 4**: Multiple choice — show 3-4 implementations, learner picks the correct one

## Project Templates
- Claude creates a project directory with README, starter files, and a task list
- Learner implements features one at a time
- Each feature is a commit-sized chunk
- Claude reviews after each feature, provides feedback, suggests improvements
- Example: "Build a CLI todo app" — starter with argument parsing done, learner implements add/remove/list

## Tools
- Run code: `python [file]`, `node [file]`, `cargo run`, etc. (detect from language)
- Run tests: language-appropriate test runner
- Lint: optional, language-specific

## Common Misconceptions
- Off-by-one errors in loops and indices
- Mutability vs. immutability confusion
- Reference vs. value semantics
- Scope and closure confusion
- Async/callback confusion (JS-specific)
