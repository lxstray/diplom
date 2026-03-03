-- CreateTable
CREATE TABLE "CollabDocument" (
    "roomId" TEXT NOT NULL,
    "state" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollabDocument_pkey" PRIMARY KEY ("roomId")
);

-- AddForeignKey
ALTER TABLE "CollabDocument" ADD CONSTRAINT "CollabDocument_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

