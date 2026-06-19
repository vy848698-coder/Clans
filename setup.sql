-- Run this once in phpMyAdmin (or MySQL CLI) to create the database + table.

CREATE DATABASE IF NOT EXISTS clansmachina
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE clansmachina;

CREATE TABLE IF NOT EXISTS leads (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  name       VARCHAR(120)  NOT NULL,
  phone      VARCHAR(30)   NOT NULL,
  email      VARCHAR(150)  NOT NULL,
  city       VARCHAR(120)  NOT NULL,
  service    VARCHAR(80)   DEFAULT '',
  bill       VARCHAR(80)   DEFAULT '',
  message    TEXT,
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS posts (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  title      VARCHAR(200)  NOT NULL,
  chip       VARCHAR(80)   DEFAULT '',           -- small label e.g. "PM Surya Ghar"
  category   VARCHAR(150)  DEFAULT '',           -- space-separated filter tags e.g. "subsidy residential"
  excerpt    TEXT,                               -- short text shown on the card
  body       MEDIUMTEXT,                         -- full article text
  author     VARCHAR(120)  DEFAULT '',
  read_time  VARCHAR(40)   DEFAULT '',           -- e.g. "8 min read"
  image      VARCHAR(255)  DEFAULT '',           -- path like image/blog/xyz.jpg
  hidden     TINYINT(1)    NOT NULL DEFAULT 0,    -- 1 = draft/hidden from public site
  created_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Owner-managed blog categories (single source for the upload form + public sidebar)
CREATE TABLE IF NOT EXISTS categories (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  slug       VARCHAR(60)  NOT NULL UNIQUE,         -- filter key, e.g. "residential"
  name       VARCHAR(120) NOT NULL,                -- display label, e.g. "Residential Rooftop Solar"
  sort_order INT          NOT NULL DEFAULT 0,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT IGNORE INTO categories (slug, name, sort_order) VALUES
('residential','Residential Rooftop Solar',1),
('installation','Solar Panel Installation',2),
('subsidy','Solar Subsidy',3),
('maintenance','Solar Maintenance',4),
('societies','Rooftop for Societies',5),
('commercial','Commercial Solar',6),
('roi','Solar ROI',7),
('inverters','Inverters and Batteries',8);
