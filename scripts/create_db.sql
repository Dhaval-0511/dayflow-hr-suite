-- Run this as postgres superuser to create the database and user
-- psql -U postgres -f scripts/create_db.sql

DROP DATABASE IF EXISTS hrms_db;
DROP USER IF EXISTS hrms_user;

CREATE USER hrms_user WITH PASSWORD 'hrms_pass';
CREATE DATABASE hrms_db OWNER hrms_user;
GRANT ALL PRIVILEGES ON DATABASE hrms_db TO hrms_user;

\c hrms_db
GRANT ALL ON SCHEMA public TO hrms_user;
