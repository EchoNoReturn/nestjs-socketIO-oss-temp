CREATE TABLE `sys_constant` (
    `id` bigint UNSIGNED NOT NULL COMMENT '常量主键ID',
    `category` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '常量分类（如auth/login_type）',
    `code` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '常量编码（分类内唯一）',
    `name` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '常量名称（展示用）',
    `value` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '常量值（可选）',
    `sort` int NOT NULL DEFAULT 0 COMMENT '排序值（越小越靠前）',
    `enabled` tinyint NOT NULL DEFAULT 1 COMMENT '是否启用（1启用0禁用）',
    `remark` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '备注',
    `createdAt` bigint UNSIGNED NOT NULL DEFAULT 0 COMMENT '创建时间（毫秒时间戳）',
    `updatedAt` bigint UNSIGNED NOT NULL DEFAULT 0 COMMENT '更新时间（毫秒时间戳）',
    `deletedAt` bigint UNSIGNED NULL DEFAULT NULL COMMENT '软删除时间（毫秒时间戳）',
    `sortedNum` int NOT NULL DEFAULT 1 COMMENT '排序值',
    PRIMARY KEY (`id`),
    UNIQUE INDEX `idx_category_code` (`category`, `code`) COMMENT '分类+编码唯一索引',
    INDEX `idx_deleted_created` (`deletedAt`, `createdAt`) COMMENT '软删除+创建时间索引',
    INDEX `idx_category_sort` (`category`, `sort`) COMMENT '分类+排序索引'
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '常量表（分类-编码-名称-值）';
