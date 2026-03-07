/* 
  Migration: Add age and job_title to profiles table
  Description: Expanding user profiles to include age and job_title fields.
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS age integer,
ADD COLUMN IF NOT EXISTS job_title text;
