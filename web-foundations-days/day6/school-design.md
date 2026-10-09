# School Database Design & Relational Logic

## Table Explanations
1. **\students\**: Stores biographical and login data.
2. **\courses\**: Stores module titles and course codes.
3. **\enrolments\**: Junction table mapping students to courses with \grade\.\
\
---
\
## Relationships & Join Table Rationale\
- **\students\ to \enrolments\**: One-to-Many (1:N).\
- **\courses\ to \enrolments\**: One-to-Many (1:N).\
- **\students\ to \courses\**: Many-to-Many (M:N).\
\
### Why a Join Table is Necessary\
Relational databases cannot represent M:N relationships directly without duplicate data or anti-patterns. The \enrolments\ table resolves M:N into two 1:N relationships.\
\
---\
\
## Indexing Strategy\
\\\sql\
CREATE INDEX idx_enrolments_student_id ON enrolments(student_id);\
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);\
\\\\
\
### Performance Benefits & O(log N) Justification\
- **\idx_enrolments_student_id\**: Accelerates transcript and schedule queries (\WHERE student_id = ?\). Without an index, lookups force a full table scan taking O(N) time. A B-tree index reduces lookups and multi-table JOINs to logarithmic O(log N) time complexity.\
- **\idx_enrolments_course_id\**: Speeds up course roster lookups and registration counting.\
\
---\
\
## Database Architecture Choice: SQL vs. NoSQL\
An academic record system requires strict transactional consistency, referential integrity, and ACID compliance to prevent duplicate registrations or orphaned grade records. Relational SQL databases enforce these natively through schema constraints like \FOREIGN KEY ... ON DELETE CASCADE\ and composite \UNIQUE(student_id, course_id)\ constraints. Document-based NoSQL databases require duplicating data across documents or writing error-prone manual join logic, making SQL the superior choice.
