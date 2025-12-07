-- Migration: Add ADMIN role and clubName field
-- Run this in Supabase SQL Editor if Prisma migrate fails

-- Add ADMIN to UserRole enum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';

-- Add clubName column to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "clubName" TEXT;

