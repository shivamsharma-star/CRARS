CREATE TABLE User (
    User_id VARCHAR(5) PRIMARY KEY NOT NULL,
    User_name VARCHAR(100),
    Email VARCHAR(100),
    Password VARCHAR(50),
    User_role VARCHAR(50),
    User_location VARCHAR(100),
    CONSTRAINT user_id_format CHECK (User_id REGEXP '^U[0-9]{3}$')
);
