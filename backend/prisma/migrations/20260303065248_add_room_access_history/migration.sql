-- CreateTable
CREATE TABLE "RoomAccess" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lastAccessed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoomAccess_userId_idx" ON "RoomAccess"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RoomAccess_roomId_userId_key" ON "RoomAccess"("roomId", "userId");

-- AddForeignKey
ALTER TABLE "RoomAccess" ADD CONSTRAINT "RoomAccess_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
