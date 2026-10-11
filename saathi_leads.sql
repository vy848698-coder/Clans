-- saathi_leads — Solar Saathi AI chatbot leads, read by the admin dashboard
-- (get_saathi_leads.php / update_saathi_status.php).
-- One row per chatbot conversation (unique journey_id), updated as the visitor
-- moves through the stages.
--
-- Run once on the production (Railway) database if the table isn't there yet:
--   mysql -h <host> -P <port> -u <user> -p <database> < saathi_leads.sql

CREATE TABLE IF NOT EXISTS `saathi_leads` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `journey_id` varchar(32) DEFAULT NULL,
  `stage` varchar(10) NOT NULL,
  `name` varchar(120) NOT NULL,
  `mobile` varchar(15) NOT NULL,
  `mobile_verified` tinyint(1) NOT NULL DEFAULT 0,
  `email` varchar(150) NOT NULL DEFAULT '',
  `email_verified` tinyint(1) NOT NULL DEFAULT 0,
  `language` varchar(20) NOT NULL DEFAULT '',
  `pin_code` varchar(6) NOT NULL DEFAULT '',
  `area` varchar(120) NOT NULL DEFAULT '',
  `district` varchar(80) NOT NULL DEFAULT '',
  `state` varchar(80) NOT NULL DEFAULT '',
  `ownership` varchar(30) NOT NULL DEFAULT '',
  `owner_permission` varchar(40) NOT NULL DEFAULT '',
  `property_type` varchar(40) NOT NULL DEFAULT '',
  `panels_on` varchar(40) NOT NULL DEFAULT '',
  `monthly_bill` int(11) DEFAULT NULL,
  `roof_space` varchar(30) NOT NULL DEFAULT '',
  `main_goal` varchar(40) NOT NULL DEFAULT '',
  `power_cuts` varchar(30) NOT NULL DEFAULT '',
  `install_when` varchar(30) NOT NULL DEFAULT '',
  `payment` varchar(30) NOT NULL DEFAULT '',
  `system_kw` decimal(6,2) DEFAULT NULL,
  `panels` int(11) DEFAULT NULL,
  `total_cost` int(11) DEFAULT NULL,
  `subsidy` int(11) DEFAULT NULL,
  `investment` int(11) DEFAULT NULL,
  `monthly_saving` int(11) DEFAULT NULL,
  `savings_25y` int(11) DEFAULT NULL,
  `payback_years` decimal(4,1) DEFAULT NULL,
  `consultation` varchar(30) NOT NULL DEFAULT '',
  `consult_date` date DEFAULT NULL,
  `consult_time` varchar(30) NOT NULL DEFAULT '',
  `booking_id` varchar(12) NOT NULL DEFAULT '',
  `score` int(11) NOT NULL DEFAULT 0,
  `temperature` varchar(10) NOT NULL DEFAULT '',
  `status` varchar(20) NOT NULL DEFAULT 'New',
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_journey` (`journey_id`),
  KEY `idx_mobile` (`mobile`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
