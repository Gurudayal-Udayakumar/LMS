-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "role" TEXT NOT NULL DEFAULT 'student',
    "phone" TEXT,
    "bio" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "mentor_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduled_at" DATETIME NOT NULL,
    "duration_min" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "meeting_link" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "appointments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "appointments_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "student_id" TEXT NOT NULL,
    "assigned_to" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tickets_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ticket_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ticket_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachment_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ticket_messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ticket_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "created_by" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "instructions" TEXT,
    "due_date" DATETIME,
    "max_score" INTEGER NOT NULL DEFAULT 100,
    "attachment_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "tasks_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "task_submissions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "task_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "notes" TEXT,
    "score" INTEGER,
    "feedback" TEXT,
    "evaluated_by" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "submitted_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "evaluated_at" DATETIME,
    CONSTRAINT "task_submissions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "task_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "task_submissions_evaluated_by_fkey" FOREIGN KEY ("evaluated_by") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "type" TEXT NOT NULL DEFAULT 'direct',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "chat_room_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "room_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "joined_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_room_members_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_room_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "room_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'text',
    "file_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chat_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "chat_rooms" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "job_posts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "posted_by" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "type" TEXT NOT NULL DEFAULT 'full_time',
    "description" TEXT NOT NULL,
    "requirements" TEXT,
    "salary_range" TEXT,
    "apply_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "deadline" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "job_posts_posted_by_fkey" FOREIGN KEY ("posted_by") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "job_applications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "job_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "resume_url" TEXT NOT NULL,
    "cover_letter" TEXT,
    "status" TEXT NOT NULL DEFAULT 'applied',
    "applied_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "job_applications_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "job_posts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "job_applications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "ref_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "appointments_student_id_idx" ON "appointments"("student_id");

-- CreateIndex
CREATE INDEX "appointments_mentor_id_idx" ON "appointments"("mentor_id");

-- CreateIndex
CREATE INDEX "appointments_scheduled_at_idx" ON "appointments"("scheduled_at");

-- CreateIndex
CREATE INDEX "tickets_student_id_idx" ON "tickets"("student_id");

-- CreateIndex
CREATE INDEX "tickets_status_idx" ON "tickets"("status");

-- CreateIndex
CREATE INDEX "ticket_messages_ticket_id_idx" ON "ticket_messages"("ticket_id");

-- CreateIndex
CREATE INDEX "tasks_due_date_idx" ON "tasks"("due_date");

-- CreateIndex
CREATE INDEX "task_submissions_task_id_idx" ON "task_submissions"("task_id");

-- CreateIndex
CREATE INDEX "task_submissions_student_id_idx" ON "task_submissions"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_submissions_task_id_student_id_key" ON "task_submissions"("task_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "chat_room_members_room_id_user_id_key" ON "chat_room_members"("room_id", "user_id");

-- CreateIndex
CREATE INDEX "chat_messages_room_id_created_at_idx" ON "chat_messages"("room_id", "created_at");

-- CreateIndex
CREATE INDEX "job_posts_is_active_created_at_idx" ON "job_posts"("is_active", "created_at");

-- CreateIndex
CREATE INDEX "job_applications_job_id_idx" ON "job_applications"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_applications_job_id_student_id_key" ON "job_applications"("job_id", "student_id");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");
