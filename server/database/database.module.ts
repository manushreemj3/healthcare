import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import {
  User,
  Facility,
  FacilityMembership,
  SyncOperation,
  Patient,
  QueueEntry,
  TeleconsultSession,
  TriageResult,
} from "./entities";

import { execSync } from "child_process";

const entities = [
  User,
  Facility,
  FacilityMembership,
  SyncOperation,
  Patient,
  QueueEntry,
  TeleconsultSession,
  TriageResult,
];

function isDatabaseReachable(): boolean {
  if (!process.env.DATABASE_URL) return false;
  try {
    const url = new URL(process.env.DATABASE_URL);
    const port = parseInt(url.port || "5432", 10);
    const host = url.hostname || "localhost";
    execSync(
      `node -e "require('net').createConnection(${port},'${host}').on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))"`,
      { timeout: 2000, stdio: "pipe" },
    );
    return true;
  } catch {
    return false;
  }
}

const hasDatabase = isDatabaseReachable();

@Module({
  imports: hasDatabase
    ? [
        TypeOrmModule.forRootAsync({
          useFactory: () => ({
            type: "postgres" as const,
            url: process.env.DATABASE_URL,
            entities,
            synchronize: process.env.NODE_ENV !== "production",
            logging: process.env.NODE_ENV !== "production",
            ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
          }),
        }),
        TypeOrmModule.forFeature(entities),
      ]
    : [],
  exports: hasDatabase ? [TypeOrmModule] : [],
})
export class DatabaseModule {}
