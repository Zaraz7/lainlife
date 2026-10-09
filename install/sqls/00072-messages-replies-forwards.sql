ALTER TABLE `messages` ADD COLUMN IF NOT EXISTS `reply_to` bigint(20) DEFAULT NULL AFTER `forwarded_from`;

CREATE TABLE IF NOT EXISTS `message_forwards` (
  `message` bigint(20) NOT NULL COMMENT 'сообщение, к которому прикреплены пересланные',
  `forwarded` bigint(20) NOT NULL,
  `position` smallint(5) UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`message`, `position`),
  KEY `forwarded` (`forwarded`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_520_ci;

-- forwarded_from хранил и ответы, и пересылки: пересылка уходила пустым сообщением без вложений
INSERT IGNORE INTO `message_forwards` (`message`, `forwarded`, `position`)
SELECT m.`id`, m.`forwarded_from`, 0 FROM `messages` m
WHERE m.`forwarded_from` IS NOT NULL AND m.`content` = ''
  AND NOT EXISTS (SELECT 1 FROM `attachments` a WHERE a.`target_type` = 'openvk\\Web\\Models\\Entities\\Message' AND a.`target_id` = m.`id`);

UPDATE `messages` SET `reply_to` = `forwarded_from`
WHERE `forwarded_from` IS NOT NULL AND `reply_to` IS NULL
  AND `id` NOT IN (SELECT `message` FROM `message_forwards`);
