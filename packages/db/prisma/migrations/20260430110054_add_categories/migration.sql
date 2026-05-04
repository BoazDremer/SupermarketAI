-- AlterTable
ALTER TABLE "CanonicalProduct" ADD COLUMN     "commonCategoryId" TEXT;

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "parentId" TEXT,
    "nameHe" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isLeaf" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerCategoryAlias" (
    "id" TEXT NOT NULL,
    "retailerSlug" TEXT NOT NULL,
    "chainCategoryId" TEXT NOT NULL,
    "chainCategoryName" TEXT NOT NULL,
    "chainCategoryDepth" INTEGER NOT NULL,
    "categoryId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "matchedSynonym" TEXT,
    "auto" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailerCategoryAlias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "RetailerCategoryAlias_categoryId_idx" ON "RetailerCategoryAlias"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerCategoryAlias_retailerSlug_chainCategoryId_key" ON "RetailerCategoryAlias"("retailerSlug", "chainCategoryId");

-- CreateIndex
CREATE INDEX "CanonicalProduct_commonCategoryId_idx" ON "CanonicalProduct"("commonCategoryId");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerCategoryAlias" ADD CONSTRAINT "RetailerCategoryAlias_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
