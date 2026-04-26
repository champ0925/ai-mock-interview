-- AI 面试系统 数据库初始化脚本
-- 表结构变更请直接修改本文件，并在变更说明里追加 ALTER 语句

CREATE DATABASE IF NOT EXISTS ai_interview
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ai_interview;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id            INT          AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    updatedAt     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    createdAt     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 简历缓存表（按 user_id + file_hash 唯一）
CREATE TABLE IF NOT EXISTS resume_cache (
    id            INT          AUTO_INCREMENT PRIMARY KEY,
    user_id       INT          NOT NULL,
    file_hash     VARCHAR(64)  NOT NULL,
    parsed_json   JSON         NOT NULL,
    original_name VARCHAR(255),
    created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_file (user_id, file_hash),
    KEY idx_file_hash (file_hash)
) ENGINE=InnoDB;

-- OCR 缓存表（按 user_id + file_hash 唯一），用于 jd 截图识别
CREATE TABLE IF NOT EXISTS ocr_cache (
    id          INT          AUTO_INCREMENT PRIMARY KEY,
    user_id     INT          NOT NULL,
    file_hash   VARCHAR(64)  NOT NULL,
    ocr_text    MEDIUMTEXT   NOT NULL,
    image_name  VARCHAR(255),
    created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_user_file (user_id, file_hash),
    KEY idx_file_hash (file_hash)
) ENGINE=InnoDB;

-- 修复方法（一次性，针对开发环境此前 sync({alter:true}) 累积的冗余 username 唯一索引导致的 ER_TOO_MANY_KEYS）：
--   1. SHOW INDEX FROM users;
--   2. 保留 PRIMARY 与一个 username 的 UNIQUE，其它 username 索引全部 DROP INDEX <name> ON users;
--   后续靠本脚本 + 显式 ALTER 维护 schema，不再依赖 sequelize.sync({alter:true})