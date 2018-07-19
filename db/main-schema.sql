BEGIN TRANSACTION;
CREATE TABLE "URLs" (
	`hash`	TEXT,
	`authorAccount`	INTEGER,
	`author`	TEXT,
	`target`	TEXT,
	`creationTime`	INTEGER,
	`expiryTime`	INTEGER,
	PRIMARY KEY(`hash`)
);
CREATE TABLE "Pastes" (
	`pasteID`	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE,
	`authorAccount`	INTEGER,
	`author`	TEXT,
	`content`	TEXT,
	`creationTime`	INTEGER,
	`expiryTime`	INTEGER
);
CREATE TABLE "Images" (
	`imageID`	TEXT,
	`extension`	TEXT,
	`author`	TEXT,
	`creationTime`	INTEGER,
	`expiryTime`	INTEGER,
	PRIMARY KEY(`imageID`)
);
CREATE TABLE `Hits` (
	`url`	TEXT,
	`hits`	INTEGER,
	PRIMARY KEY(`url`)
);
CREATE TABLE "Accounts" (
	`userID`	INTEGER PRIMARY KEY AUTOINCREMENT,
	`username`	TEXT UNIQUE,
	`hash`	TEXT,
	`salt`	TEXT
);
CREATE TABLE "AccountTokens" (
	`userID`	INTEGER,
	`token`	TEXT UNIQUE,
	`expires`	INTEGER,
	PRIMARY KEY(`userID`,`token`)
);
COMMIT;
