-- CREATE TABLES

CREATE TABLE students (
    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE
);

CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    UNIQUE (student_id, course_id)
);

-- INSERT SAMPLE DATA

INSERT INTO students (name, email) VALUES
('Alice Smith', 'alice@example.com'),
('Bob Jones', 'bob@example.com'),
('Charlie Brown', 'charlie@example.com'),
('Diana Prince', 'diana@example.com');

INSERT INTO courses (title, code) VALUES
('Web Foundations', 'CS101'),
('Database Systems', 'CS102'),
('JavaScript Programming', 'CS103');

INSERT INTO enrolments (student_id, course_id, grade) VALUES
(1, 1, 'A'),
(1, 2, 'B'),
(2, 1, 'C'),
(2, 3, 'A'),
(3, 2, 'B');

-- FIVE REQUIRED QUERIES

-- 1. All courses for one student (by name)
SELECT c.course_id, c.code, c.title, e.grade
FROM courses c
JOIN enrolments e ON c.course_id = e.course_id
JOIN students s ON e.student_id = s.student_id
WHERE s.name = 'Alice Smith';

-- 2. All students on one course
SELECT s.student_id, s.name, s.email, e.grade
FROM students s
JOIN enrolments e ON s.student_id = e.student_id
JOIN courses c ON e.course_id = c.course_id
WHERE c.title = 'Web Foundations';

-- 3. The number of students per course
SELECT c.course_id, c.title, COUNT(e.student_id) AS student_count
FROM courses c
LEFT JOIN enrolments e ON c.course_id = e.course_id
GROUP BY c.course_id, c.title;

-- 4. Students who have no enrolments
SELECT s.student_id, s.name, s.email
FROM students s
LEFT JOIN enrolments e ON s.student_id = e.student_id
WHERE e.enrolment_id IS NULL;

-- 5. Update of one enrolment's grade
UPDATE enrolments
SET grade = 'A+'
WHERE student_id = 2 AND course_id = 1;