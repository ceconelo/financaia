/*
  Warnings:

  - A unique constraint covering the columns `[dashboardToken]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "dashboardToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_dashboardToken_key" ON "User"("dashboardToken");
