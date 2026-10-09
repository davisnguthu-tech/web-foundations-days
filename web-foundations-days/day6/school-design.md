# School Database Design & Relational Logic

## Table Descriptions

1. **`students`**: Stores basic biographical and identification details for individual students (first name, last name, and unique email address).
2. **`courses`**: Contains information regarding academic modules offered by the school, including the full course title and a unique alphanumeric course code.
3. **`enrolments`**: Acts as the junction (bridge) table linking students to their respective courses. It manages the relational link while holding student-and-course specific metadata, such as academic `grade`.

---

## Entity Relationships & Join Table Rationale

- **`students` to `enrolments`**: **One-to-Many ($1:N$)**. A single student can register for multiple course enrolments, but each enrolment entry corresponds to exactly one student.
- **`courses` to `enrolments`**: **One-to-Many ($1:N$)**. A single course can accept multiple student enrolments, but each enrolment entry corresponds to exactly one course.
- **`students` to `courses`**: **Many-to-Many ($M:N$)**. A student can enroll in multiple courses, and a course can contain multiple enrolled students.

### Why a Join Table is Necessary

Relational databases cannot cleanly represent a direct Many-to-Many relationship without causing critical design flaws like non-atomic data storage (e.g., storing array/comma-separated strings of course IDs in a single student row) or massive data duplication across rows. The `enrolments` table resolves the $M:N$ relationship into two clean $1:N$ relationships, preserving database normalization rules while serving as the logical container for contextual attributes like `grade`.

---

## Indexing Strategy

```sql
CREATE INDEX idx_enrolments_student_id ON enrolments(student_id);
```
