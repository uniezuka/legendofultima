-- Campaign has no win/loss record: it's single-player against a fixed AI
-- ramp, not a competitive result worth tracking. Campaign progress is
-- already tracked separately via CampaignProgress.highestUnlocked.
ALTER TABLE "MatchStats" DROP COLUMN "campaignWins",
DROP COLUMN "campaignLosses";
