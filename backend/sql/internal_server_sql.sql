drop database if exists internal_server;
-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema internal_server
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema internal_server
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `internal_server` DEFAULT CHARACTER SET utf8 ;
USE `internal_server` ;

-- -----------------------------------------------------
-- Table `internal_server`.`users`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `internal_server`.`users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(45) NOT NULL,
  `email` VARCHAR(100) NOT NULL,
  `password` VARCHAR(100) NOT NULL,
  `nickname` VARCHAR(45) NOT NULL,
  `deletion` TINYINT NOT NULL DEFAULT 0,
  `limit_amount` VARCHAR(45) NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `internal_server`.`pool_sockets`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `internal_server`.`pool_sockets` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `ip` VARCHAR(20) NOT NULL,
  `port` INT NOT NULL,
  `cpu_usage` FLOAT NOT NULL,
  `memory_usage` FLOAT NOT NULL,
  `is_live` TINYINT NOT NULL DEFAULT 1,
  `limit_amount` INT NOT NULL DEFAULT 200,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `internal_server`.`channels`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `internal_server`.`channels` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(45) NOT NULL,
  `limit_amount` INT NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `internal_server`.`spaces`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `internal_server`.`spaces` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(45) NOT NULL,
  `volume` FLOAT NOT NULL,
  `owner` VARCHAR(45) NOT NULL,
  `limit_amount` INT NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `internal_server`.`allocation`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `internal_server`.`allocation` (
  `channel_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `space_id` INT NOT NULL,
  `type` VARCHAR(45) NOT NULL DEFAULT 'viewer',
  `status` TINYINT NOT NULL DEFAULT 1,
  INDEX `fk_server_has_user_user1_idx` (`user_id` ASC) VISIBLE,
  INDEX `fk_server_has_user_channel1_idx` (`channel_id` ASC) VISIBLE,
  INDEX `fk_server_has_user_spaces1_idx` (`space_id` ASC) VISIBLE,
  CONSTRAINT `fk_server_has_user_channel1`
    FOREIGN KEY (`channel_id`)
    REFERENCES `internal_server`.`channels` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_server_has_user_user1`
    FOREIGN KEY (`user_id`)
    REFERENCES `internal_server`.`users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_server_has_user_spaces1`
    FOREIGN KEY (`space_id`)
    REFERENCES `internal_server`.`spaces` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `internal_server`.`pool_publishers`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `internal_server`.`pool_publishers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `ip` VARCHAR(20) NOT NULL,
  `port` INT NOT NULL,
  `is_live` TINYINT NOT NULL DEFAULT 1,
  `limit_amount` INT NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `internal_server`.`locales`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `internal_server`.`locales` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `region` VARCHAR(100) NOT NULL,
  `limit_amount` INT NOT NULL,
  PRIMARY KEY (`id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `internal_server`.`connection`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `internal_server`.`connection` (
  `socket_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `publisher_id` INT NOT NULL,
  `locale_id` INT NOT NULL,
  `connected` TINYINT NOT NULL DEFAULT 1,
  INDEX `fk_socket_has_user_user1_idx` (`user_id` ASC) VISIBLE,
  INDEX `fk_socket_has_user_socket1_idx` (`socket_id` ASC) VISIBLE,
  INDEX `fk_publisher_has_user_publisher1_idx` (`publisher_id` ASC) VISIBLE,
  INDEX `fk_publisher_has_user_locale1_idx` (`locale_id` ASC) VISIBLE,
  CONSTRAINT `fk_socket_has_user_socket1`
    FOREIGN KEY (`socket_id`)
    REFERENCES `internal_server`.`pool_sockets` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_socket_has_user_user1`
    FOREIGN KEY (`user_id`)
    REFERENCES `internal_server`.`users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_publisher_has_user_publisher1`
    FOREIGN KEY (`publisher_id`)
    REFERENCES `internal_server`.`pool_publishers` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_publisher_has_user_locale1`
    FOREIGN KEY (`locale_id`)
    REFERENCES `internal_server`.`locales` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `internal_server`.`sync`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `internal_server`.`sync` (
  `my_id` INT NOT NULL,
  `friend_id` INT NOT NULL,
  INDEX `fk_user_has_user_user2_idx` (`friend_id` ASC) VISIBLE,
  INDEX `fk_user_has_user_user1_idx` (`my_id` ASC) VISIBLE,
  CONSTRAINT `fk_user_has_user_user1`
    FOREIGN KEY (`my_id`)
    REFERENCES `internal_server`.`users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_user_has_user_user2`
    FOREIGN KEY (`friend_id`)
    REFERENCES `internal_server`.`users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;

select locales.id as l_id,
	pool_sockets.id as ps_id,
	pool_publishers.id as pp_id,
    spaces.id as s_id,
    channels.id as ch_id,
    users.id as u_id,
    connection.*,
    allocation.*
from users
left join allocation
on users.id = allocation.user_id
left join connection
on users.id = connection.user_id
left join locales
on locales.id = connection.locale_id
left join pool_sockets
on pool_sockets.id = connection.socket_id
left join pool_publishers
on pool_publishers.id = connection.publisher_id
left join spaces
on spaces.id = allocation.space_id
left join channels
on channels.id = allocation.channel_id
group by allocation.channel_id, connection.socket_id;
