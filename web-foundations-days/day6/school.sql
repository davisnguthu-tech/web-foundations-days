-- ==========================================
-- 1. Table Schemas (SQLite Compatible)
-- ==========================================

-- Students Table
CREATE TABLE students (
    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

-- Courses Table
CREATE TABLE courses (
    course_id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_name TEXT NOT NULL,
    course_code TEXT NOT NULL UNIQUE
);

-- Enrolments Table (Junction table linking students and courses)
CREATE TABLE enrolments (
    enrolment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    UNIQUE(student_id, course_id) -- Rule preventing dual enrolment in the same course
);

-- ==========================================
-- 2. Sample Data Insertion
-- ==========================================

-- Insert 5 Students (Balanced for Kenyan region/tribe & gender)
-- Note: Faith Chepkoech has no enrolments (used to demonstrate Query 4)
INSERT INTO students (first_name, last_name, email) VALUES
('Wanjiku', 'Mwangi', 'wanjiku.mwangi@school.ac.ke'),   -- Female (Central / Kikuyu)
('Amina', 'Hassan', 'amina.hassan@school.ac.ke'),       -- Female (Coast & North Eastern / Swahili-Somali)
('John', 'Kamau', 'john.kamau@school.ac.ke'),           -- Male (Central / Kikuyu)
('Otieno', 'Ochieng', 'otieno.ochieng@school.ac.ke'),   -- Male (Nyanza / Luo)
('Faith', 'Chepkoech', 'faith.chepkoech@school.ac.ke'); -- Female (Rift Valley / Kalenjin)

-- Insert 3 Courses
INSERT INTO courses (course_name, course_code) VALUES
('Database Systems', 'CS101'),
('Web Development', 'CS102'),
('Software Engineering', 'CS103');

-- Insert 5 Enrolment Records
INSERT INTO enrolments (student_id, course_id, grade) VALUES
(1, 1, 'A'),   -- Wanjiku -> Database Systems
(1, 2, 'B+'),  -- Wanjiku -> Web Development
(2, 1, 'A-'),  -- Amina   -> Database Systems
(3, 2, 'B'),   -- John    -> Web Development
(4, 3, 'A');   -- Otieno  -> Software Engineering

-- ==========================================
-- 3. Five Required Queries
-- ==========================================

-- Query 1: All courses for one student (by name: 'Wanjiku Mwangi')
SELECT c.course_code, c.course_name, e.grade
FROM courses c
JOIN enrolments e ON c.course_id = e.course_id
JOIN students s ON s.student_id = e.student_id
WHERE s.first_name = 'Wanjiku' AND s.last_name = 'Mwangi';

-- Query 2: All students on one course (by course code: 'CS101')
SELECT s.first_name, s.last_name, s.email, e.grade
FROM students s
JOIN enrolments e ON s.student_id = e.student_id
JOIN courses c ON c.course_id = e.course_id
WHERE c.course_code = 'CS101';

-- Query 3: The number of students per course
SELECT c.course_code, c.course_name, COUNT(e.student_id) AS total_students
FROM courses c
LEFT JOIN enrolments e ON c.course_id = e.course_id
GROUP BY c.course_id, c.course_code, c.course_name;

-- Query 4: Students who have no enrolments
SELECT s.student_id, s.first_name, s.last_name, s.email
FROM students s
LEFT JOIN enrolments e ON s.student_id = e.student_id
WHERE e.enrolment_id IS NULL;

-- Query 5: Update one enrolment's grade (Updating John Kamau's grade in Web Development)
UPDATE enrolments
SET grade = 'A'
WHERE student_id = 3 AND course_id = 2;