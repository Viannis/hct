/*
  Warnings:

  - You are about to drop the column `perimeter` on the `Location` table. All the data in the column will be lost.
  - Added the required column `radius` to the `Location` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Location" DROP COLUMN "perimeter",
ADD COLUMN     "radius" DOUBLE PRECISION NOT NULL;
