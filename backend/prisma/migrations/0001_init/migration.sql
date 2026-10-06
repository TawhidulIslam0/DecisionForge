CREATE TABLE "Decision" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "question" TEXT NOT NULL,
  "input" JSONB NOT NULL,
  "result" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Decision_pkey" PRIMARY KEY ("id")
);
