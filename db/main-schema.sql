BEGIN TRANSACTION;
DROP TABLE IF EXISTS `URLs`;
CREATE TABLE IF NOT EXISTS `URLs` (
	`hash`	TEXT,
	`authorAccount`	INTEGER,
	`author`	TEXT,
	`target`	TEXT,
	`creationTime`	INTEGER,
	`expiryTime`	INTEGER,
	PRIMARY KEY(`hash`)
);
DROP TABLE IF EXISTS `Pastes`;
CREATE TABLE IF NOT EXISTS `Pastes` (
	`pasteID`	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
	`authorAccount`	INTEGER,
	`author`	TEXT,
	`content`	TEXT,
	`creationTime`	INTEGER,
	`expiryTime`	INTEGER
);
DROP TABLE IF EXISTS `DiscordQuotes`;
CREATE TABLE IF NOT EXISTS `DiscordQuotes` (
	`id`	TEXT,
	`messageID`	TEXT,
	`channelID`	TEXT,
	`guildID`	TEXT,
	`content`	TEXT,
	`author`	TEXT,
	`image`	TEXT,
	PRIMARY KEY(`id`)
);
DROP TABLE IF EXISTS `DomainHits`;
CREATE TABLE IF NOT EXISTS `DomainHits` (
	`domain`	TEXT,
	`hits`	INTEGER,
	PRIMARY KEY(`domain`)
);
DROP TABLE IF EXISTS `InvidiousServers`;
CREATE TABLE IF NOT EXISTS `InvidiousServers` (
	`country`	TEXT,
	`prefix`	TEXT,
	PRIMARY KEY(`country`)
);
DROP TABLE IF EXISTS `Images`;
CREATE TABLE IF NOT EXISTS `Images` (
	`imageID`	TEXT,
	`extension`	TEXT,
	`author`	TEXT,
	`creationTime`	INTEGER,
	`expiryTime`	INTEGER,
	PRIMARY KEY(`imageID`)
);
DROP TABLE IF EXISTS `Hits`;
CREATE TABLE IF NOT EXISTS `Hits` (
	`url`	TEXT,
	`hits`	INTEGER,
	PRIMARY KEY(`url`)
);
DROP TABLE IF EXISTS `Godmaster`;
CREATE TABLE IF NOT EXISTS `Godmaster` (
	`userID`	INTEGER,
	`summary`	TEXT,
	PRIMARY KEY(`userID`)
);
DROP TABLE IF EXISTS `BingoTiles`;
CREATE TABLE IF NOT EXISTS `BingoTiles` (
	`id`	INTEGER,
	`cardid`	INTEGER,
	`x1`	INTEGER,
	`y1`	INTEGER,
	`x2`	INTEGER,
	`y2`	INTEGER,
	PRIMARY KEY(`id`)
);
DROP TABLE IF EXISTS `BingoTagsMap`;
CREATE TABLE IF NOT EXISTS `BingoTagsMap` (
	`cardid`	INTEGER,
	`tagid`	INTEGER,
	PRIMARY KEY(`cardid`,`tagid`)
);
DROP TABLE IF EXISTS `BingoTags`;
CREATE TABLE IF NOT EXISTS `BingoTags` (
	`id`	INTEGER PRIMARY KEY AUTOINCREMENT,
	`name`	INTEGER,
	`description`	TEXT
);
DROP TABLE IF EXISTS `BingoCards`;
CREATE TABLE IF NOT EXISTS `BingoCards` (
	`id`	INTEGER PRIMARY KEY AUTOINCREMENT,
	`name`	TEXT,
	`url`	TEXT,
	`external`	TEXT,
	`author`	TEXT
);
DROP TABLE IF EXISTS `Accounts`;
CREATE TABLE IF NOT EXISTS `Accounts` (
	`userID`	INTEGER PRIMARY KEY AUTOINCREMENT,
	`username`	TEXT UNIQUE,
	`hash`	TEXT,
	`salt`	TEXT
);
DROP TABLE IF EXISTS `AccountTokens`;
CREATE TABLE IF NOT EXISTS `AccountTokens` (
	`userID`	INTEGER,
	`token`	TEXT UNIQUE,
	`expires`	INTEGER,
	PRIMARY KEY(`userID`,`token`)
);
DROP TABLE IF EXISTS `AccountSubscriptions`;
CREATE TABLE IF NOT EXISTS `AccountSubscriptions` (
	`userID`	TEXT,
	`channelID`	TEXT,
	PRIMARY KEY(`userID`,`channelID`)
);
COMMIT;
