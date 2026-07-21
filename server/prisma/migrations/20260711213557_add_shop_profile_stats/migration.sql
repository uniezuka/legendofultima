-- CreateTable
CREATE TABLE "PlayerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "ownedMonsters" TEXT[] DEFAULT ARRAY['slime', 'goblin', 'archer', 'knight', 'dragon']::TEXT[],
    "loadout" TEXT[] DEFAULT ARRAY['slime', 'goblin', 'archer', 'knight', 'dragon']::TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "campaignWins" INTEGER NOT NULL DEFAULT 0,
    "campaignLosses" INTEGER NOT NULL DEFAULT 0,
    "pvpWins" INTEGER NOT NULL DEFAULT 0,
    "pvpLosses" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MatchStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PlayerProfile_userId_key" ON "PlayerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MatchStats_userId_key" ON "MatchStats"("userId");

-- AddForeignKey
ALTER TABLE "PlayerProfile" ADD CONSTRAINT "PlayerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchStats" ADD CONSTRAINT "MatchStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
