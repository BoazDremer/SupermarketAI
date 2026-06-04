-- AlterTable
ALTER TABLE "RetailerProduct" ADD COLUMN     "chainDepartmentId" TEXT,
ADD COLUMN     "chainGroupId" TEXT,
ADD COLUMN     "chainSubGroupId" TEXT;

-- CreateIndex
CREATE INDEX "RetailerProduct_chainDepartmentId_idx" ON "RetailerProduct"("chainDepartmentId");
