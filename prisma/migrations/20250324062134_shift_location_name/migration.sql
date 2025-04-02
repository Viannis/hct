/*
  Warnings:

  - You are about to drop the column `locationId` on the `Shift` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Shift" DROP CONSTRAINT "Shift_locationId_fkey";

-- AlterTable
ALTER TABLE "Shift" DROP COLUMN "locationId",
ADD COLUMN     "locationName" TEXT;
