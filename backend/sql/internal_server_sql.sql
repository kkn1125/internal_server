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
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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


-- -----------------------------------------------------
-- Table `internal_server`.`locations`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `internal_server`.`locations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `space_id` INT NOT NULL,
  `channel_id` INT NOT NULL,
  `pox` FLOAT NOT NULL DEFAULT 0,
  `poy` FLOAT NOT NULL DEFAULT 0,
  `poz` FLOAT NOT NULL DEFAULT 0,
  `roy` FLOAT NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  INDEX `fk_locations_allocation3_idx` (`user_id` ASC) VISIBLE,
  CONSTRAINT `fk_locations_allocation3`
    FOREIGN KEY (`user_id`)
    REFERENCES `internal_server`.`allocation` (`user_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;



use internal_server;
SELECT 
    locales.id AS l_id,
    pool_sockets.id AS ps_id,
    pool_publishers.id AS pp_id,
    spaces.id AS s_id,
    channels.id AS ch_id,
    users.id AS u_id,
    connection.*,
    allocation.*
FROM
    users
        LEFT JOIN
    allocation ON users.id = allocation.user_id
        LEFT JOIN
    connection ON users.id = connection.user_id
        LEFT JOIN
    locales ON locales.id = connection.locale_id
        LEFT JOIN
    pool_sockets ON pool_sockets.id = connection.socket_id
        LEFT JOIN
    pool_publishers ON pool_publishers.id = connection.publisher_id
        LEFT JOIN
    spaces ON spaces.id = allocation.space_id
        LEFT JOIN
    channels ON channels.id = allocation.channel_id;
#GROUP BY allocation.channel_id , connection.socket_id;

# SELECT 
#     *,
#     COUNT(connection.socket_id)
# FROM
#     locales
#         LEFT JOIN
#     connection ON locales.id = connection.locale_id
# GROUP BY locales.id;

# SELECT 
#     *, COUNT(*) AS user_count
# FROM
#     connection
# GROUP BY locale_id;

# SELECT 
#     locales.*
#     #COUNT(DISTINCT (pool_sockets.id)) AS socket_count,
#     #COUNT(users.id) AS user_count
# FROM
#     locales
#         LEFT JOIN
#     connection ON locales.id = connection.locale_id
#         LEFT JOIN
#     pool_sockets ON connection.socket_id = pool_sockets.id
#         LEFT JOIN
#     users ON users.id = connection.user_id
# WHERE
#     locales.region LIKE 'southKorea%'
# GROUP BY locales.id;

SELECT 
    *
FROM
    connection order by locale_id, socket_id;
    
SELECT 
    space_id, channel_id
FROM
    allocation
WHERE
    user_id = (SELECT 
            id
        FROM
            users
        WHERE
            uuid = '2546cb2c-15ac-4ba4-9eea-a845861abe36');

SELECT 
    allocation.space_id, allocation.channel_id, users.*
FROM
    allocation
        LEFT JOIN
    users ON allocation.user_id = users.id
WHERE
    channel_id = (SELECT 
            allocation.channel_id
        FROM
            users
                LEFT JOIN
            allocation ON users.id = allocation.user_id
        WHERE
            users.uuid = 'cd8c1a34-a1f4-4a4a-8cfa-121c5f3f04ba')
        AND allocation.type = 'player';
select * from locations;
# SELECT 
#     channels.*,
#     COUNT(*) AS count,
#     COUNT(*) >= channels.limit_amount AS is_full
# FROM
#     channels
#         LEFT JOIN
#     allocation ON channels.id = allocation.channel_id
#         LEFT JOIN
#     users ON allocation.user_id = users.id
# WHERE
#     allocation.user_id = users.id;

SELECT
      spaces.*,
      channels.limit_amount as c_limit,
      space_id AS id,
      COUNT(DISTINCT(channel_id)) AS count,
      COUNT(user_id) AS user_count
    FROM allocation
    LEFT JOIN spaces
    ON spaces.id = allocation.space_id
    LEFT JOIN channels
    ON channels.id = allocation.channel_id
    GROUP BY space_id
    ORDER BY space_id;
    
select * from connection;

select * from pool_publishers;

SELECT 
    pool_publishers.*, COUNT(*) AS publisher_count
FROM
    connection
        LEFT JOIN
    pool_publishers ON pool_publishers.id = connection.publisher_id
GROUP BY publisher_id;