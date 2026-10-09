# School Database Design & Relational Logic

## Table Explanations

1. **`students`**: Stores core biographical and login identity data for each student (first name, last name, and unique email address).
2. **`courses`**: Stores information on modules offered by the institution, including course titles and unique course codes.
3. **`enrolments`**: Serves as the junction (bridge) table mapping students to courses. It maintains foreign key references while holding relationship-specific attributes such as `grade`.

---

## Relationships & Join Table Rationale

- **`students` to `enrolments`**: One-to-Many (1:N). A student can have multiple course enrolment entries, but each entry belongs to a single student.
- **`courses` to `enrolments`**: One-to-Many (1:N). A course can appear across multiple enrolment records, but each record references a single course.
- **`students` to `courses`**: Many-to-Many (M:N). A student takes multiple courses, and a course accommodates multiple students.

### Why a Join Table is Necessary

Relational databases cannot cleanly represent a direct Many-to-Many relationship without introducing anti-patterns such as storing comma-separated values in a single column or duplicating entity records across multiple rows. The `enrolments` join table breaks the M:N mapping into two normalized 1:N relationships while serving as the logical container for contextual values like `grade`.

---

## Indexing Strategy

```sql
CREATE INDEX idx_enrolments_student_id ON enrolments(student_id);
CREATE INDEX idx_enrolments_course_id ON enrolments(course_id);
```

### Performance Benefits
- **`idx_enrolments_student_id`**: Accelerates queries filtering or joining by student (e.g., fetching all courses taken by a student).
- **`idx_enrolments_course_id`**: Accelerates queries filtering or joining by course (e.g., listing all enrolled students or counting registrations per course).

