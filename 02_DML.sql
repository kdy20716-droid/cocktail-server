/*
    DML(Data manipulation Language)
    - 테이블에 저장된 데이터를 다루는 언어
    - INSERT(추가), SELECT(조회), UPDATE(수정), DELETE(삭제)
*/
-- INSERT : 테이블에 새로운 행을 추가
-- INSERT INTO 테이블명 VALUES(id값, 네임값, 이메일값, 패스워드값)
INSERT INTO users 
VALUES(1, '유저01', 'user01@google.com', '1234');

-- 에러 컬럼 수가 맞지 않아서
INSERT INTO users 
VALUES('유저01', 'user01@google.com', '1234');

-- 테이블명(컬럼명, 컬럼명, ...) 기재
INSERT INTO users (name, email, password)
VALUES('유저01', 'user02@google.com', '1234');

-- 컬럼명 순서는 상관없음 (컬럼명 순서랑 값 순서는 동일)
INSERT INTO users (email, password, name)
VALUES('유저01', 'user02@google.com', '1234');

-- SELECT : 테이블에 저장된 데이터 조회
/*
    SELECT * FROM 테이블명; => 전체 컬럼 조회
    SELECT 컬럼명, 컬럼명, ...
    FROM 테이블명;
    WHERE 조건;
*/
-- * : 전체 컬럼명 조회
SELECT * FROM users;

-- 필요한 컬럼명만 조회
SELECT email, password 
FROM users;

-- 이름이 '유저01'인 사람들의 name, email을 조회
SELECT name, email
FROM users
WHERE name = '유저01';

-- id가 1인 사람의 email, password 조회
SELECT email, password
FROM users
WHERE id = 1;

-- 레시피 한개 추가
-- user_id : 1, name : 모히또
-- image : 모히또.jpg, description : 상큼하고 청량한 쿠바식 칵테일
INSERT INTO recipes (user_id, name, image, description)
VALUES(1, '모히또', '모히또.jpg', '상큼하고 청량한 쿠바식 칵테일');

-- 레시피 name이 모히또인 레코드 1개 조회
SELECT * FROM recipes
WHERE name = '모히또';

-- UPDATE : 테이블에 저장된 데이터를 수정
/*
    UPDATE 테이블명
    SET 컬럼명 = 값, 컬럼명 = 값, ...
    WHERE 조건;
*/
-- users 테이블에서 id가 3인 사람의 password를 pass01로 변경
UPDATE users
SET password = 'pass01'
WHERE id = 3;

-- recipes 테이블에서 name이 모히또인 레시피를
-- name : 네그로니, description : 진의 드라이함, 스위트 베리무트... 로 수정
UPDATE recipes
SET name = '네그로니', description = '진의 드라이함, 스위트 베리무트...'
WHERE name = '모히또';

SELECT * FROM recipes;

-- DELETE : 테이블에 저장된 데이터를 삭제
/*
    DELETE FROM 테이블명
    WHERE 조건;
*/
-- recipes 테이블에서 name이 네그로니인 데이터 삭제
DELETE FROM recipes
WHERE name = '네그로니';

SELECT * FROM recipes;

-- users 테이블에 있는 데이터 전부 삭제
DELETE FROM users; -- 조건이 없으면 해당 테이블에 있는 모든 데이터 삭제
TRUNCATE TABLE users; -- 전체 데이터를 한번에 삭제(초기화, FK걸려있을 경우 실행 X)

SELECT * FROM users;



