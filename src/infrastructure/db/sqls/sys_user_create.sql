CREATE TABLE `tt_unity_game`.`user` (
    `id` bigint UNSIGNED NOT NULL COMMENT '用户主键ID',
    `username` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '用户名（登录用）',
    `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL COMMENT '密码哈希值',
    `email` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '邮箱（登录用）',
    `phone_area_code` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '手机号区号（如+86）',
    `phone_number` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL DEFAULT NULL COMMENT '手机号（登录用）',
    `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    `deleted_at` datetime NULL DEFAULT NULL COMMENT '软删除时间',
    PRIMARY KEY (`id`),
    -- 登录字段单独索引（支持单字段登录查询）
    UNIQUE INDEX `idx_username` (`username`) COMMENT '用户名唯一索引（登录用）',
    UNIQUE INDEX `idx_email` (`email`) COMMENT '邮箱唯一索引（登录用）',
    -- 手机号+区号联合唯一索引（避免不同区号下手机号重复）
    UNIQUE INDEX `idx_phone` (
        `phone_area_code`,
        `phone_number`
    ) COMMENT '手机号（区号+号码）唯一索引（登录用）',
    -- 软删除+创建时间索引（支持按创建时间筛选未删除用户）
    INDEX `idx_deleted_created` (`deleted_at`, `created_at`) COMMENT '软删除+创建时间索引'
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci COMMENT = '用户表（支持多方式登录）';
