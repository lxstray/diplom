-- CreateTable
CREATE TABLE "TaskRoomSession" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "taskSlug" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "accessLevel" "RoomAccessLevel" NOT NULL DEFAULT 'ANYONE_WITH_LINK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaskRoomSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskRoomSession_roomId_key" ON "TaskRoomSession"("roomId");

-- CreateIndex
CREATE INDEX "TaskRoomSession_roomId_idx" ON "TaskRoomSession"("roomId");

-- CreateIndex
CREATE INDEX "TaskRoomSession_ownerId_idx" ON "TaskRoomSession"("ownerId");
