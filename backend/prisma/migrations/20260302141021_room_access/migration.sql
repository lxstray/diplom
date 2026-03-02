-- CreateEnum
CREATE TYPE "RoomAccessLevel" AS ENUM ('OWNER', 'ANYONE_WITH_LINK');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "access" "RoomAccessLevel" NOT NULL DEFAULT 'OWNER';
