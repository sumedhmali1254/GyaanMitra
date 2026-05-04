# GyaanMitra Database Schema & SQL Guide

This document contains a complete overview of all the tables in the `GyaanMitra` MySQL database, their respective columns matching your current backend Sequelize models, and basic SQL commands to help you view and manage your data.

> [!NOTE]
> The application uses **MySQL** as its primary database. The structure below is managed automatically through Sequelize ORM.

---

## 1. Database Tables Overview

Here are all the 9 tables existing in your database along with their columns:

### `users`
Stores all account information, credentials, and settings.
* **id**: INTEGER (Primary Key, Auto Increment)
* **first_name**: VARCHAR(50)
* **last_name**: VARCHAR(50)
* **email**: VARCHAR(255) (Unique)
* **password**: VARCHAR(255) (Encrypted)
* **phone**: VARCHAR(20)
* **location**: VARCHAR(100)
* **bio**: TEXT
* **avatar**: VARCHAR(255)
* **settings**: JSON
* **createdAt**: TIMESTAMP
* **updatedAt**: TIMESTAMP

### `Flashcards`
Stores the study flashcards tied to specific syllabus subjects and chapters.
* **id**: UUID (Primary Key)
* **question**: TEXT
* **answer**: TEXT
* **subject**: VARCHAR(255)
* **chapter**: VARCHAR(255)
* **topic**: TEXT
* **source**: VARCHAR(255) (Default: 'pdf')
* **userId**: INTEGER (Foreign Key -> `users.id`)
* **createdAt**: TIMESTAMP
* **updatedAt**: TIMESTAMP

### `Notes`
Stores sticky notes created by the user for study categorization.
* **id**: UUID (Primary Key)
* **text**: TEXT
* **category**: VARCHAR(255) (Default: 'study')
* **done**: BOOLEAN (Default: false)
* **pinned**: BOOLEAN (Default: false)
* **userId**: INTEGER (Foreign Key -> `users.id`)
* **createdAt**: TIMESTAMP
* **updatedAt**: TIMESTAMP

### `study_sessions`
Tracks the focus timer modes, durations, and session statuses.
* **id**: UUID (Primary Key)
* **duration**: INTEGER (In minutes)
* **mode**: VARCHAR(20) (pomodoro, short_break, etc.)
* **startTime**: DATETIME
* **endTime**: DATETIME
* **status**: VARCHAR(20) (completed, abandoned)
* **userId**: INTEGER (Foreign Key -> `users.id`)
* **createdAt**: TIMESTAMP
* **updatedAt**: TIMESTAMP

### `quiz_results`
Logs historical quiz scores taken by the user.
* **id**: UUID (Primary Key)
* **courseTitle**: VARCHAR(255)
* **score**: INTEGER
* **totalQuestions**: INTEGER
* **accuracy**: FLOAT
* **difficulty**: VARCHAR(255) (Default: 'medium')
* **completedAt**: DATETIME
* **userId**: INTEGER (Foreign Key -> `users.id`)
* **createdAt**: TIMESTAMP
* **updatedAt**: TIMESTAMP

### `planner_subjects` [NEW]
Stores the study planner subjects and their parameters.
* **id**: VARCHAR(255) (Primary Key)
* **subject**: VARCHAR(255)
* **chapters**: INTEGER
* **chaptersRemaining**: INTEGER
* **avg_chapter_time**: FLOAT
* **examDate**: VARCHAR(255)
* **priority**: VARCHAR(255)
* **beginnerMode**: BOOLEAN
* **scheduleMode**: VARCHAR(255)
* **familiarity**: VARCHAR(255)
* **syllabusSize**: VARCHAR(255)
* **difficulty**: INTEGER
* **pastScore**: INTEGER
* **completion**: INTEGER
* **startTime**: VARCHAR(255)
* **endTime**: VARCHAR(255)
* **availableHours**: FLOAT
* **weeklyAvailability**: JSON
* **userId**: INTEGER (Foreign Key -> `users.id`)
* **createdAt**: TIMESTAMP
* **updatedAt**: TIMESTAMP

### `planner_sessions` [NEW]
Stores the generated study timetable blocks.
* **id**: VARCHAR(255) (Primary Key)
* **date**: VARCHAR(255)
* **day**: VARCHAR(255)
* **subject**: VARCHAR(255)
* **chapter**: INTEGER
* **startTime**: VARCHAR(255)
* **endTime**: VARCHAR(255)
* **duration**: FLOAT
* **priority**: VARCHAR(255)
* **daysLeft**: INTEGER
* **completed**: BOOLEAN
* **userId**: INTEGER (Foreign Key -> `users.id`)
* **createdAt**: TIMESTAMP
* **updatedAt**: TIMESTAMP

### `planner_recommendations` [NEW]
Stores the AI Advisor's alerts and optimization advice.
* **id**: INTEGER (Primary Key, Auto Increment)
* **subjectName**: VARCHAR(255)
* **message**: TEXT
* **priority**: VARCHAR(255)
* **daysLeft**: INTEGER
* **hoursNeeded**: FLOAT
* **hoursAvailable**: FLOAT
* **hoursScheduled**: FLOAT
* **chaptersCoverable**: INTEGER
* **chaptersTotal**: INTEGER
* **percentageCompleted**: INTEGER
* **shortageHours**: FLOAT
* **isWarning**: BOOLEAN
* **userId**: INTEGER (Foreign Key -> `users.id`)
* **createdAt**: TIMESTAMP
* **updatedAt**: TIMESTAMP

---

## 2. Basic SQL Commands

You can execute these commands in your MySQL interactive terminal or any graphical database viewer (like DBeaver, phpMyAdmin, or MySQL Workbench). 

### Log into MySQL & Select Database
```sql
-- Login via terminal
mysql -u root -p

-- Select the GyaanMitra database to use
USE your_database_name; -- Replace with value of DB_NAME in your backend/.env
```

### Viewing Tables & Schema Structures
```sql
-- See all tables in the database
SHOW TABLES;

-- See the detailed structure and column types of a specific table
DESCRIBE users;
DESCRIBE Flashcards;
DESCRIBE study_sessions;
```

### Querying Data (Viewing Data)
```sql
-- View all registered users
SELECT id, first_name, last_name, email FROM users;

-- View all flashcards for a specific subject
SELECT question, answer, chapter FROM Flashcards WHERE subject = 'Physics';

-- View all completed study sessions ordered by newest first
SELECT duration, mode, startTime FROM study_sessions WHERE status = 'completed' ORDER BY createdAt DESC;

-- View all quiz results for a specific user ID (e.g., user ID 1)
SELECT courseTitle, score, accuracy FROM quiz_results WHERE user_id = 1;

-- View your persistent study planner subjects
SELECT subject, examDate, priority FROM planner_subjects;

-- View your generated timetable sessions for today
SELECT subject, startTime, endTime FROM planner_sessions WHERE date = '2026-04-05';
```

### Common Maintenance Commands
```sql
-- Delete all flashcards for a specific subject
DELETE FROM Flashcards WHERE subject = 'Old Subject';

-- Count how many notes a user has
SELECT COUNT(*) FROM Notes WHERE userId = 1;

-- Make a user an admin or change a setting inside JSON (MySQL 5.7+ syntax)
UPDATE users SET settings = JSON_SET(settings, '$.theme', 'dark') WHERE id = 1;
```
