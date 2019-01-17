BEGIN TRANSACTION;
CREATE TABLE IF NOT EXISTS `URLs` (
	`hash`	TEXT,
	`authorAccount`	INTEGER,
	`author`	TEXT,
	`target`	TEXT,
	`creationTime`	INTEGER,
	`expiryTime`	INTEGER,
	PRIMARY KEY(`hash`)
);
CREATE TABLE IF NOT EXISTS `Pastes` (
	`pasteID`	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
	`authorAccount`	INTEGER,
	`author`	TEXT,
	`content`	TEXT,
	`creationTime`	INTEGER,
	`expiryTime`	INTEGER
);
CREATE TABLE IF NOT EXISTS `InvidiousServers` (
	`country`	TEXT,
	`prefix`	TEXT,
	PRIMARY KEY(`country`)
);
CREATE TABLE IF NOT EXISTS `Images` (
	`imageID`	TEXT,
	`extension`	TEXT,
	`author`	TEXT,
	`creationTime`	INTEGER,
	`expiryTime`	INTEGER,
	PRIMARY KEY(`imageID`)
);
CREATE TABLE IF NOT EXISTS `Hits` (
	`url`	TEXT,
	`hits`	INTEGER,
	PRIMARY KEY(`url`)
);
CREATE TABLE IF NOT EXISTS `Godmaster` (
	`userID`	INTEGER,
	`summary`	TEXT,
	PRIMARY KEY(`userID`)
);
CREATE TABLE IF NOT EXISTS `BingoTiles` (
	`id`	INTEGER,
	`cardid`	INTEGER,
	`x1`	INTEGER,
	`y1`	INTEGER,
	`x2`	INTEGER,
	`y2`	INTEGER,
	PRIMARY KEY(`id`)
);
CREATE TABLE IF NOT EXISTS `BingoTagsMap` (
	`cardid`	INTEGER,
	`tagid`	INTEGER,
	PRIMARY KEY(`cardid`,`tagid`)
);
CREATE TABLE IF NOT EXISTS `BingoTags` (
	`id`	INTEGER PRIMARY KEY AUTOINCREMENT,
	`name`	INTEGER,
	`description`	TEXT
);
CREATE TABLE IF NOT EXISTS `BingoCards` (
	`id`	INTEGER PRIMARY KEY AUTOINCREMENT,
	`name`	TEXT,
	`url`	TEXT,
	`external`	TEXT,
	`author`	TEXT
);
CREATE TABLE IF NOT EXISTS `Accounts` (
	`userID`	INTEGER PRIMARY KEY AUTOINCREMENT,
	`username`	TEXT UNIQUE,
	`hash`	TEXT,
	`salt`	TEXT
);
CREATE TABLE IF NOT EXISTS `AccountTokens` (
	`userID`	INTEGER,
	`token`	TEXT UNIQUE,
	`expires`	INTEGER,
	PRIMARY KEY(`userID`,`token`)
);
CREATE TABLE IF NOT EXISTS `AccountSubscriptions` (
	`userID`	TEXT,
	`channelID`	TEXT,
	PRIMARY KEY(`userID`,`channelID`)
);
COMMIT;
