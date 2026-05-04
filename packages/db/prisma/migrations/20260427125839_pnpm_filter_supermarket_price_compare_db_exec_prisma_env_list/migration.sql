-- CreateEnum
CREATE TYPE "ProductMatchType" AS ENUM ('EXACT_BARCODE', 'EQUIVALENT', 'SUBSTITUTE');

-- CreateEnum
CREATE TYPE "RetailerPromotionKind" AS ENUM ('UNKNOWN', 'PRICE_OVERRIDE', 'PERCENT_OFF', 'MULTI_BUY', 'THRESHOLD', 'BOGO', 'LOYALTY', 'CART_LEVEL');

-- CreateEnum
CREATE TYPE "RetailerPromotionItemRole" AS ENUM ('PRIMARY_TARGET', 'QUALIFYING', 'REWARD', 'BUNDLE_COMPONENT');

-- CreateEnum
CREATE TYPE "BasketComparisonLineResolution" AS ENUM ('EXACT_BARCODE', 'EQUIVALENT', 'SUBSTITUTE', 'MISSING');

-- CreateEnum
CREATE TYPE "IngestionRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "IngestionFileType" AS ENUM ('PRICE', 'PROMOTION', 'STORE', 'PRODUCT', 'OTHER');

-- CreateTable
CREATE TABLE "Retailer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "displayNameHe" TEXT,
    "supportsDelivery" BOOLEAN NOT NULL DEFAULT true,
    "websiteUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Retailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerStore" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "externalStoreId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "city" TEXT,
    "deliveryOffered" BOOLEAN NOT NULL DEFAULT false,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailerStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerProduct" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "externalItemCode" TEXT NOT NULL,
    "barcode" TEXT,
    "normalizedName" TEXT,
    "name" TEXT NOT NULL,
    "nameHe" TEXT,
    "brand" TEXT,
    "unitLabel" TEXT,
    "packDescription" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailerProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerPrice" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "retailerProductId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ILS',
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "effectiveTo" TIMESTAMP(3),
    "observedAt" TIMESTAMP(3) NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailerPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerPromotion" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "kind" "RetailerPromotionKind" NOT NULL DEFAULT 'UNKNOWN',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "externalPromotionId" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailerPromotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerPromotionItem" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "retailerProductId" TEXT NOT NULL,
    "role" "RetailerPromotionItemRole" NOT NULL DEFAULT 'PRIMARY_TARGET',
    "minQuantity" DECIMAL(12,3),
    "promoPriceMinor" INTEGER,
    "percentOff" DECIMAL(5,2),
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailerPromotionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanonicalProduct" (
    "id" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "displayNameHe" TEXT,
    "brand" TEXT,
    "barcodeGtin" TEXT,
    "categoryKey" TEXT,
    "unitHint" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanonicalProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMatch" (
    "id" TEXT NOT NULL,
    "canonicalProductId" TEXT NOT NULL,
    "retailerProductId" TEXT NOT NULL,
    "matchType" "ProductMatchType" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingBag" (
    "id" TEXT NOT NULL,
    "userSessionId" TEXT,
    "label" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppingBag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShoppingBagItem" (
    "id" TEXT NOT NULL,
    "bagId" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "canonicalProductId" TEXT,
    "retailerId" TEXT,
    "retailerProductId" TEXT,
    "note" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShoppingBagItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BasketComparison" (
    "id" TEXT NOT NULL,
    "shoppingBagId" TEXT NOT NULL,
    "comparedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "overallConfidenceScore" DOUBLE PRECISION,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BasketComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BasketComparisonRetailerResult" (
    "id" TEXT NOT NULL,
    "basketComparisonId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "totalBeforePromotionsMinor" INTEGER NOT NULL,
    "promotionSavingsMinor" INTEGER NOT NULL,
    "missingShoppingBagItemIds" JSONB NOT NULL,
    "substitutedShoppingBagItemIds" JSONB NOT NULL,
    "exactMatchCount" INTEGER NOT NULL,
    "equivalentMatchCount" INTEGER NOT NULL,
    "substituteMatchCount" INTEGER NOT NULL,
    "confidenceScore" DOUBLE PRECISION NOT NULL,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BasketComparisonRetailerResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BasketComparisonItemResult" (
    "id" TEXT NOT NULL,
    "basketComparisonRetailerResultId" TEXT NOT NULL,
    "shoppingBagItemId" TEXT NOT NULL,
    "resolution" "BasketComparisonLineResolution" NOT NULL,
    "matchType" "ProductMatchType",
    "canonicalProductId" TEXT,
    "chosenRetailerProductId" TEXT,
    "lineTotalMinor" INTEGER,
    "lineTotalBeforePromotionsMinor" INTEGER,
    "linePromotionSavingsMinor" INTEGER,
    "detail" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BasketComparisonItemResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "status" "IngestionRunStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "stats" JSONB,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionFile" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "fileType" "IngestionFileType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sha256" TEXT,
    "sizeBytes" INTEGER,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ingestionRunId" TEXT,
    "rawData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IngestionFile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Retailer_slug_key" ON "Retailer"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerStore_retailerId_externalStoreId_key" ON "RetailerStore"("retailerId", "externalStoreId");

-- CreateIndex
CREATE INDEX "RetailerProduct_barcode_idx" ON "RetailerProduct"("barcode");

-- CreateIndex
CREATE INDEX "RetailerProduct_retailerId_externalItemCode_idx" ON "RetailerProduct"("retailerId", "externalItemCode");

-- CreateIndex
CREATE INDEX "RetailerProduct_normalizedName_idx" ON "RetailerProduct"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerProduct_retailerId_storeId_externalItemCode_key" ON "RetailerProduct"("retailerId", "storeId", "externalItemCode");

-- CreateIndex
CREATE INDEX "RetailerPrice_retailerId_storeId_retailerProductId_idx" ON "RetailerPrice"("retailerId", "storeId", "retailerProductId");

-- CreateIndex
CREATE INDEX "RetailerPrice_isCurrent_idx" ON "RetailerPrice"("isCurrent");

-- CreateIndex
CREATE INDEX "RetailerPrice_retailerProductId_storeId_isCurrent_idx" ON "RetailerPrice"("retailerProductId", "storeId", "isCurrent");

-- CreateIndex
CREATE INDEX "RetailerPromotion_retailerId_storeId_idx" ON "RetailerPromotion"("retailerId", "storeId");

-- CreateIndex
CREATE INDEX "RetailerPromotionItem_promotionId_idx" ON "RetailerPromotionItem"("promotionId");

-- CreateIndex
CREATE INDEX "RetailerPromotionItem_retailerProductId_idx" ON "RetailerPromotionItem"("retailerProductId");

-- CreateIndex
CREATE INDEX "CanonicalProduct_barcodeGtin_idx" ON "CanonicalProduct"("barcodeGtin");

-- CreateIndex
CREATE INDEX "ProductMatch_canonicalProductId_idx" ON "ProductMatch"("canonicalProductId");

-- CreateIndex
CREATE INDEX "ProductMatch_retailerProductId_idx" ON "ProductMatch"("retailerProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMatch_canonicalProductId_retailerProductId_key" ON "ProductMatch"("canonicalProductId", "retailerProductId");

-- CreateIndex
CREATE INDEX "ShoppingBag_userSessionId_idx" ON "ShoppingBag"("userSessionId");

-- CreateIndex
CREATE INDEX "ShoppingBagItem_bagId_idx" ON "ShoppingBagItem"("bagId");

-- CreateIndex
CREATE INDEX "ShoppingBagItem_canonicalProductId_idx" ON "ShoppingBagItem"("canonicalProductId");

-- CreateIndex
CREATE INDEX "ShoppingBagItem_retailerProductId_idx" ON "ShoppingBagItem"("retailerProductId");

-- CreateIndex
CREATE INDEX "BasketComparison_shoppingBagId_idx" ON "BasketComparison"("shoppingBagId");

-- CreateIndex
CREATE INDEX "BasketComparisonRetailerResult_basketComparisonId_idx" ON "BasketComparisonRetailerResult"("basketComparisonId");

-- CreateIndex
CREATE INDEX "BasketComparisonRetailerResult_retailerId_storeId_idx" ON "BasketComparisonRetailerResult"("retailerId", "storeId");

-- CreateIndex
CREATE INDEX "BasketComparisonItemResult_basketComparisonRetailerResultId_idx" ON "BasketComparisonItemResult"("basketComparisonRetailerResultId");

-- CreateIndex
CREATE INDEX "BasketComparisonItemResult_shoppingBagItemId_idx" ON "BasketComparisonItemResult"("shoppingBagItemId");

-- CreateIndex
CREATE INDEX "IngestionFile_retailerId_fileType_fileName_idx" ON "IngestionFile"("retailerId", "fileType", "fileName");

-- AddForeignKey
ALTER TABLE "RetailerStore" ADD CONSTRAINT "RetailerStore_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerProduct" ADD CONSTRAINT "RetailerProduct_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerProduct" ADD CONSTRAINT "RetailerProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "RetailerStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerPrice" ADD CONSTRAINT "RetailerPrice_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerPrice" ADD CONSTRAINT "RetailerPrice_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "RetailerStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerPrice" ADD CONSTRAINT "RetailerPrice_retailerProductId_fkey" FOREIGN KEY ("retailerProductId") REFERENCES "RetailerProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerPromotion" ADD CONSTRAINT "RetailerPromotion_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerPromotion" ADD CONSTRAINT "RetailerPromotion_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "RetailerStore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerPromotionItem" ADD CONSTRAINT "RetailerPromotionItem_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "RetailerPromotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerPromotionItem" ADD CONSTRAINT "RetailerPromotionItem_retailerProductId_fkey" FOREIGN KEY ("retailerProductId") REFERENCES "RetailerProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMatch" ADD CONSTRAINT "ProductMatch_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMatch" ADD CONSTRAINT "ProductMatch_retailerProductId_fkey" FOREIGN KEY ("retailerProductId") REFERENCES "RetailerProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingBagItem" ADD CONSTRAINT "ShoppingBagItem_bagId_fkey" FOREIGN KEY ("bagId") REFERENCES "ShoppingBag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingBagItem" ADD CONSTRAINT "ShoppingBagItem_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingBagItem" ADD CONSTRAINT "ShoppingBagItem_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShoppingBagItem" ADD CONSTRAINT "ShoppingBagItem_retailerProductId_fkey" FOREIGN KEY ("retailerProductId") REFERENCES "RetailerProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasketComparison" ADD CONSTRAINT "BasketComparison_shoppingBagId_fkey" FOREIGN KEY ("shoppingBagId") REFERENCES "ShoppingBag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasketComparisonRetailerResult" ADD CONSTRAINT "BasketComparisonRetailerResult_basketComparisonId_fkey" FOREIGN KEY ("basketComparisonId") REFERENCES "BasketComparison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasketComparisonRetailerResult" ADD CONSTRAINT "BasketComparisonRetailerResult_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasketComparisonRetailerResult" ADD CONSTRAINT "BasketComparisonRetailerResult_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "RetailerStore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasketComparisonItemResult" ADD CONSTRAINT "BasketComparisonItemResult_basketComparisonRetailerResultI_fkey" FOREIGN KEY ("basketComparisonRetailerResultId") REFERENCES "BasketComparisonRetailerResult"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasketComparisonItemResult" ADD CONSTRAINT "BasketComparisonItemResult_shoppingBagItemId_fkey" FOREIGN KEY ("shoppingBagItemId") REFERENCES "ShoppingBagItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionFile" ADD CONSTRAINT "IngestionFile_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionFile" ADD CONSTRAINT "IngestionFile_ingestionRunId_fkey" FOREIGN KEY ("ingestionRunId") REFERENCES "IngestionRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
