CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`phone` varchar(20) NOT NULL,
	`lineType` varchar(32),
	`status` enum('unverified','verified','blocked') NOT NULL DEFAULT 'unverified',
	`source` enum('flow_a','flow_b','callback') NOT NULL DEFAULT 'flow_b',
	`answers` json,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
