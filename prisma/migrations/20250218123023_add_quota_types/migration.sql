/*
  Warnings:

  - You are about to drop the column `totalCharacters` on the `CharacterQuota` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CharacterQuota" DROP COLUMN "totalCharacters",
ADD COLUMN     "permanentQuota" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "quotaExpiry" TIMESTAMP(3),
ADD COLUMN     "temporaryQuota" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "usedCharacters" SET DEFAULT 0;
