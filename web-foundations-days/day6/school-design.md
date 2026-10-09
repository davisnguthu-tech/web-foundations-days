# School Database Design

## Table Overview & Relationships

This schema models a school enrollment system using three tables:

- **`students`**: Stores core information about individual students (`student_id`, `name`, `email`).
- **`courses`**: Stores information about available courses (`course_id`, `title`, `code`).
- **`enrolments`**: Links students to the courses they take and stores course-specific data like `grade`.

### Relationships & Junction Table

- **Student to Enrolment (One-to-Many):** One student can enroll in multiple courses, but each enrolment record belongs to exactly one student.
- **Course to Enrolment (One-to-Many):** One course can have many students enrolled, but each enrolment record belongs to exactly one course.
- **Student to Course (Many-to-Many):** Because a student can take multiple courses, and a course can have multiple students, direct foreign keys cannot represent this dynamic without creating duplicate rows or structural issues. A join table (`enrolments`) is required to break down this Many-to-Many relationship into two One-to-Many relationships, maintaining database normalization while allowing attributes specific to the connection (like `grade`) to be stored.

---

## Recommended Index

```sql
CREATE INDEX idx_enrolments_student_id ON enrolments(student_id);
```

**Reasoning:** In an academic platform, queries fetching all courses or transcript details for a specific student (`WHERE student_id = ?`) occur far more frequently than schema modifications. Indexing `student_id` in the `enrolments` join table speeds up `JOIN` lookups and speeds up queries filtering by individual student IDs, preventing full table scans as the dataset grows.

---

## Architecture Decision: SQL vs. NoSQL

I would choose a **SQL (Relational)** database for this school management system. School platforms rely heavily on strict data integrity, structured relations, and strict constraints (e.g., ensuring a student cannot register twice for the same class via `UNIQUE(student_id, course_id)` or orphaned records via foreign key constraints). Relational databases excel at multi-table relational queries via `JOIN`s and ACID-compliant transactions (ensuring enrolment, grading, and tuition tracking updates occur reliably without data drift). While a Document-based NoSQL system could nest enrolments inside student documents, doing so would create duplicate course data and complicate cross-course analytics (such as aggregating total students per class).
